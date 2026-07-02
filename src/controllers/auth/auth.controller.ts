import { type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../../utils/prisma.js';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import redis from '../../config/redis.js'; // Using your existing Redis setup!
import { getAuth } from 'firebase-admin/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'zoat_super_secret_key_2026_xyz';

// Generate JWT Token
const generateToken = (userId: string) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Generate a random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// 1. Send OTP (to Email or Phone)
export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
    const { identifier } = req.body; // can be an email OR a phone number

    if (!identifier) {
        throw new ApiError(400, "Please provide an email or phone number.");
    }

    const otp = generateOTP();

    // Store the OTP in Redis. 'EX', 300 means it automatically expires/deletes after 5 minutes!
    await redis.set(`otp:${identifier}`, otp, 'EX', 300);

    // TODO: Later, we will add Twilio (for SMS) or Nodemailer (for Emails) here.
    // For now, we print it to the console so your frontend developer can test it.
    console.log(`\n📲 [DEV MODE] MOCK OTP FOR ${identifier}: ${otp}\n`);

    res.status(200).json(new ApiResponse(200, { otp }, `OTP sent successfully to ${identifier}`));
});

// 2. Verify OTP & Login/Register
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, otp, name } = req.body;

    if (!identifier || !otp) {
        throw new ApiError(400, "Identifier and OTP are required.");
    }

    const storedOtp = await redis.get(`otp:${identifier}`);

    if (!storedOtp || storedOtp !== otp) {
        throw new ApiError(401, "Invalid or expired OTP.");
    }

    // 2. OTP is valid! Delete it from Redis so it cannot be reused (security best practice)
    await redis.del(`otp:${identifier}`);

    // 3. Check if user already exists in the database
    let user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: identifier },
                { phone: identifier }
            ]
        }
    });

    // 4. If user doesn't exist, this is a Registration! Create them automatically.
    if (!user) {
        // Simple check to see if the identifier is an email or phone
        const isEmail = identifier.includes('@');

        user = await prisma.user.create({
            data: {
                name: name || "New User",
                email: isEmail ? identifier : null,
                phone: !isEmail ? identifier : null
            }
        });
    }

    // 5. Generate Auth Token and send response
    const token = generateToken(user.id);

    res.status(200).json(
        new ApiResponse(200, { user, token }, "Authentication successful")
    );
});

export const verifyPhoneAndLogin = asyncHandler(async (req: Request, res: Response) => {
    const { idToken, name } = req.body;

    if (!idToken) throw new ApiError(400, "ID token is required");

    // Decode the token using Firebase Admin
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const { uid, phone_number } = decodedToken;

    if (!phone_number) throw new ApiError(400, "Phone number is missing from the verified token");

    // Check if user already exists
    let user = await prisma.user.findUnique({
        where: { firebaseUid: uid }
    });

    let isNewUser = false;

    // If user does not exist, treat as Registration
    if (!user) {
        if (!name) throw new ApiError(400, "Name is required for new user registration");

        user = await prisma.user.create({
            data: {
                firebaseUid: uid,
                phone: phone_number,
                name: name,
            }
        });
        isNewUser = true;
    }

    // Generate our backend's custom JWT
    const customJwt = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
    );

    const message = isNewUser ? "User registered successfully" : "Logged in successfully";
    const statusCode = isNewUser ? 201 : 200;

    res.status(statusCode).json(
        new ApiResponse(statusCode, { token: customJwt, user }, message)
    );
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) throw new ApiError(400, "No active session token found");

    // Decode the token to find its expiration time
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;

    if (decoded.exp) {
        // Calculate remaining seconds until the token naturally expires
        const timeToExpire = decoded.exp - Math.floor(Date.now() / 1000);

        if (timeToExpire > 0) {
            // Add the token to the Redis blacklist for the remainder of its life
            await redis.set(`blacklist_${token}`, 'true', 'EX', timeToExpire);
        }
    }

    res.status(200).json(new ApiResponse(200, null, "Logged out successfully"));
});
