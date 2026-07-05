import { type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../utils/prisma.js';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import redis from '../../config/redis.js'; // Using your existing Redis setup!
import { getAuth } from 'firebase-admin/auth';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
}

const OTP_TTL_SECONDS = 300;
const OTP_SEND_LIMIT = 5;
const OTP_SEND_WINDOW_SECONDS = 900;
const OTP_VERIFY_ATTEMPT_LIMIT = 5;
const PROFILE_TOKEN_TTL = '10m';
const DEV_EXPOSE_OTP_IN_RESPONSE = process.env.EXPOSE_OTP_IN_RESPONSE === 'true';

type NormalizedIdentifier = {
    normalizedIdentifier: string;
    isEmail: boolean;
};

const normalizeAndValidateIdentifier = (identifier: unknown): NormalizedIdentifier => {
    if (typeof identifier !== 'string' || !identifier.trim()) {
        throw new ApiError(400, 'Please provide a valid email or phone number.');
    }

    const raw = identifier.trim();
    const isEmail = raw.includes('@');

    if (isEmail) {
        const normalizedEmail = raw.toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            throw new ApiError(400, 'Please provide a valid email address.');
        }
        return { normalizedIdentifier: normalizedEmail, isEmail: true };
    }

    const compactPhone = raw.replace(/[\s\-()]/g, '');
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    if (!phoneRegex.test(compactPhone)) {
        throw new ApiError(400, 'Please provide a valid phone number.');
    }

    return { normalizedIdentifier: compactPhone, isEmail: false };
};

const hashOtp = (otp: string) => {
    return crypto.createHash('sha256').update(otp).digest('hex');
};

const incrementWithWindow = async (key: string, windowSeconds: number) => {
    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, windowSeconds);
    }
    return count;
};

const isUniqueConstraintError = (error: unknown) => {
    return !!error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002';
};

const generateProfileCompletionToken = (normalizedIdentifier: string, isEmail: boolean) => {
    return jwt.sign(
        {
            purpose: 'complete_profile',
            identifier: normalizedIdentifier,
            isEmail
        },
        JWT_SECRET,
        { expiresIn: PROFILE_TOKEN_TTL }
    );
};

// Generate JWT Token
const generateToken = (userId: string, role: string) => {
    return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '7d' });
};

// Generate a random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP (to Email or Phone)
export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
    const { identifier } = req.body;
    const { normalizedIdentifier } = normalizeAndValidateIdentifier(identifier);
    const requestIp = req.ip || 'unknown';

    const sendByIdentifierKey = `otp:send:identifier:${normalizedIdentifier}`;
    const sendByIpKey = `otp:send:ip:${requestIp}`;
    const [identifierSendCount, ipSendCount] = await Promise.all([
        incrementWithWindow(sendByIdentifierKey, OTP_SEND_WINDOW_SECONDS),
        incrementWithWindow(sendByIpKey, OTP_SEND_WINDOW_SECONDS)
    ]);

    if (identifierSendCount > OTP_SEND_LIMIT || ipSendCount > OTP_SEND_LIMIT * 2) {
        throw new ApiError(429, 'Too many OTP requests. Please try again later.');
    }

    const otp = generateOTP();
    const otpHash = hashOtp(otp);
    const otpKey = `otp:${normalizedIdentifier}`;

    // Store the OTP in Redis. 'EX', 300 means it automatically expires/deletes after 5 minutes!
    await redis.set(otpKey, otpHash, 'EX', OTP_TTL_SECONDS);

    // TODO: Later, we will add Twilio (for SMS) or Nodemailer (for Emails) here.
    // For now, we print it to the console so your frontend developer can test it.
    if (process.env.NODE_ENV !== 'production') {
        console.log(`\n[DEV MODE] MOCK OTP FOR ${normalizedIdentifier}: ${otp}\n`);
    }

    const responseData = { otp };

    res.status(200).json(new ApiResponse(200, responseData, `OTP sent successfully to ${normalizedIdentifier}`));
});

// Verify OTP & Login/Register
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, otp } = req.body;

    if (!otp || typeof otp !== 'string' || !otp.trim()) {
        throw new ApiError(400, 'Identifier and OTP are required.');
    }

    const { normalizedIdentifier, isEmail } = normalizeAndValidateIdentifier(identifier);
    const otpKey = `otp:${normalizedIdentifier}`;
    const verifyAttemptsKey = `otp:attempts:${normalizedIdentifier}`;
    const otpHash = hashOtp(otp.trim());

    const currentAttemptsRaw = await redis.get(verifyAttemptsKey);
    const currentAttempts = Number(currentAttemptsRaw || '0');
    if (currentAttempts >= OTP_VERIFY_ATTEMPT_LIMIT) {
        throw new ApiError(429, 'Too many failed OTP attempts. Please request a new OTP.');
    }

    const storedOtpHash = await redis.get(otpKey);

    if (!storedOtpHash || storedOtpHash !== otpHash) {
        const failedAttempts = await incrementWithWindow(verifyAttemptsKey, OTP_TTL_SECONDS);
        if (failedAttempts >= OTP_VERIFY_ATTEMPT_LIMIT) {
            throw new ApiError(429, 'Too many failed OTP attempts. Please request a new OTP.');
        }
        throw new ApiError(401, 'Invalid or expired OTP.');
    }

    // OTP is valid! Delete it from Redis so it cannot be reused (security best practice)
    await redis.del(otpKey);
    await redis.del(verifyAttemptsKey);

    // Check if user already exists in the database
    let user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: normalizedIdentifier },
                { phone: normalizedIdentifier }
            ]
        }
    });

    // Existing users log in immediately.
    if (!user) {
        const profileToken = generateProfileCompletionToken(normalizedIdentifier, isEmail);
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    requiresProfileCompletion: true,
                    profileToken
                },
                'OTP verified. Please complete your profile.'
            )
        );
    }

    // Generate Auth Token and send response
    const token = generateToken(user.id, user.role);

    res.status(200).json(
        new ApiResponse(200, { user, token }, 'Authentication successful')
    );
});

export const completeProfile = asyncHandler(async (req: Request, res: Response) => {
    const { profileToken, name, gender, dateOfBirth, preferredLanguage, preferredCuisines, profilePictureUrl } = req.body;

    if (!profileToken || typeof profileToken !== 'string') {
        throw new ApiError(400, 'Profile token is required.');
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
        throw new ApiError(400, 'Name is required.');
    }

    if (!gender || typeof gender !== 'string' || !['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
        throw new ApiError(400, 'Gender is required and must be MALE, FEMALE, or OTHER.');
    }

    if (!dateOfBirth || typeof dateOfBirth !== 'string') {
        throw new ApiError(400, 'Date of birth is required.');
    }

    const parsedDob = new Date(dateOfBirth);
    if (isNaN(parsedDob.getTime())) {
        throw new ApiError(400, 'Date of birth must be a valid date.');
    }

    if (!preferredLanguage || typeof preferredLanguage !== 'string' || !preferredLanguage.trim()) {
        throw new ApiError(400, 'Preferred language is required.');
    }

    if (!Array.isArray(preferredCuisines) || preferredCuisines.length === 0) {
        throw new ApiError(400, 'Preferred cuisines is required and must contain at least one cuisine.');
    }

    if (!preferredCuisines.every((cuisine) => typeof cuisine === 'string' && cuisine.trim())) {
        throw new ApiError(400, 'All cuisines must be non-empty strings.');
    }

    if (profilePictureUrl && typeof profilePictureUrl !== 'string') {
        throw new ApiError(400, 'Profile picture URL must be a string.');
    }

    const decoded = jwt.verify(profileToken, JWT_SECRET) as jwt.JwtPayload;
    const identifier = decoded.identifier;
    const isEmail = decoded.isEmail;
    const purpose = decoded.purpose;

    if (purpose !== 'complete_profile' || typeof identifier !== 'string' || typeof isEmail !== 'boolean') {
        throw new ApiError(401, 'Invalid profile token.');
    }

    let user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: identifier },
                { phone: identifier }
            ]
        }
    });

    if (!user) {
        try {
            user = await prisma.user.create({
                data: {
                    name: name.trim(),
                    email: isEmail ? identifier : null,
                    phone: !isEmail ? identifier : null,
                    gender: gender.toUpperCase(),
                    dateOfBirth: parsedDob,
                    preferredLanguage: preferredLanguage.trim(),
                    preferredCuisines: preferredCuisines.map((c) => c.trim()),
                    profilePictureUrl: profilePictureUrl?.trim() || null
                }
            });
        } catch (error) {
            if (!isUniqueConstraintError(error)) {
                throw error;
            }

            user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: identifier },
                        { phone: identifier }
                    ]
                }
            });

            if (!user) {
                throw new ApiError(409, 'User creation failed. Please retry.');
            }
        }
    }

    const token = generateToken(user.id, user.role);

    res.status(201).json(
        new ApiResponse(201, { user, token }, 'Profile completed successfully')
    );
});

export const verifyPhoneAndLogin = asyncHandler(async (req: Request, res: Response) => {
    const { idToken, name } = req.body;

    if (!idToken) throw new ApiError(400, 'ID token is required');

    // Decode the token using Firebase Admin
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const { uid, phone_number } = decodedToken;

    if (!phone_number) throw new ApiError(400, 'Phone number is missing from the verified token');

    const { normalizedIdentifier: normalizedPhone } = normalizeAndValidateIdentifier(phone_number);

    // Check if user already exists
    let user = await prisma.user.findFirst({
        where: {
            OR: [
                { firebaseUid: uid },
                { phone: normalizedPhone }
            ]
        }
    });

    let isNewUser = false;

    if (user?.firebaseUid && user.firebaseUid !== uid) {
        throw new ApiError(409, 'Phone number is already linked with another account.');
    }

    if (user && !user.firebaseUid) {
        user = await prisma.user.update({
            where: { id: user.id },
            data: { firebaseUid: uid }
        });
    }

    // If user does not exist, treat as Registration
    if (!user) {
        if (!name) throw new ApiError(400, 'Name is required for new user registration');

        try {
            user = await prisma.user.create({
                data: {
                    firebaseUid: uid,
                    phone: normalizedPhone,
                    name: name,
                }
            });
        } catch (error) {
            if (!isUniqueConstraintError(error)) {
                throw error;
            }

            const existingUser = await prisma.user.findFirst({
                where: { phone: normalizedPhone }
            });

            if (!existingUser) {
                throw new ApiError(409, 'Could not create user. Please retry.');
            }

            user = await prisma.user.update({
                where: { id: existingUser.id },
                data: { firebaseUid: uid }
            });
        }
        isNewUser = true;
    }

    // Generate our backend's custom JWT
    const customJwt = generateToken(user.id, user.role);

    const message = isNewUser ? 'User registered successfully' : 'Logged in successfully';
    const statusCode = isNewUser ? 201 : 200;

    res.status(statusCode).json(
        new ApiResponse(statusCode, { token: customJwt, user }, message)
    );
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) throw new ApiError(400, 'No active session token found');

    // Decode the token to find its expiration time
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

    if (decoded.exp) {
        // Calculate remaining seconds until the token naturally expires
        const timeToExpire = decoded.exp - Math.floor(Date.now() / 1000);

        if (timeToExpire > 0) {
            // Add the token to the Redis blacklist for the remainder of its life
            await redis.set(`blacklist_${token}`, 'true', 'EX', timeToExpire);
        }
    }

    res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});
