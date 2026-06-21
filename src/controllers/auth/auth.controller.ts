import { type Request, type Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import prisma from '../../utils/prisma.js';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import redis from '../../config/redis.js';

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