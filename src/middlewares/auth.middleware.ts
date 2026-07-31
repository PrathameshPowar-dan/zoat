import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/AsyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import redis from '../config/redis.js';
import prisma from '../utils/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
}

export interface AuthRequest extends Request {
    user?: any;
}

export const protectRoute = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) throw new ApiError(401, "Access denied. No token provided.");

    // Check if the token was blacklisted due to a logout
    const isBlacklisted = await redis.get(`blacklist_${token}`);
    console.log("Token:", token, "Is Blacklisted:", isBlacklisted); // Debugging line
    if (isBlacklisted) {
        throw new ApiError(401, "Session expired. Please log in again.");
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        console.log(decoded);

        const user = await prisma.user.findUnique({
            where: { id: decoded.id }
        });

        req.user = user;
        next();
    } catch (error: any) {
        console.error("JWT Error:", error.name);
        console.error("JWT Message:", error.message);
        throw error;
    }
});