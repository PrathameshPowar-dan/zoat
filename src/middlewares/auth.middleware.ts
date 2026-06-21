import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/AsyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import redis from '../config/redis.js';

export interface AuthRequest extends Request {
    user?: any;
}

export const protectRoute = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) throw new ApiError(401, "Access denied. No token provided.");

    // Check if the token was blacklisted due to a logout
    const isBlacklisted = await redis.get(`blacklist_${token}`);
    if (isBlacklisted) {
        throw new ApiError(401, "Session expired. Please log in again.");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = decoded;
        next();
    } catch (error) {
        throw new ApiError(403, "Invalid or expired token");
    }
});