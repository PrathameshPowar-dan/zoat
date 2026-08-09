import { type Response } from 'express';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
}
import prisma from '../../utils/prisma.js';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { type AuthRequest } from '../../middlewares/auth.middleware.js';
import redis from '../../config/redis.js';

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;

    const {
        name,
        gender,
        dateOfBirth,
        preferredLanguage,
        preferredCuisines,
        profilePictureUrl,
        email,
    } = req.body;

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            ...(name !== undefined && { name: name.trim() }),
            ...(gender !== undefined && { gender }),
            ...(dateOfBirth !== undefined && {
                dateOfBirth: dateOfBirth
                    ? (() => {
                        const [day, month, year] = dateOfBirth.split("/");

                        return new Date(
                            Number(year),
                            Number(month) - 1,
                            Number(day)
                        );
                    })()
                    : null
            }),
            ...(preferredLanguage !== undefined && {
                preferredLanguage
            }),
            ...(preferredCuisines !== undefined && {
                preferredCuisines
            }),
            ...(profilePictureUrl !== undefined && {
                profilePictureUrl
            }),
            ...(email !== undefined && { email: email.trim() })
        },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            gender: true,
            dateOfBirth: true,
            preferredLanguage: true,
            preferredCuisines: true,
            profilePictureUrl: true
        }
    });

    res.status(200).json(
        new ApiResponse(200, updatedUser, "Profile updated successfully")
    );
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await prisma.user.findUnique({
        where: {
            id: req.user.id
        },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            gender: true,
            dateOfBirth: true,
            preferredLanguage: true,
            preferredCuisines: true,
            profilePictureUrl: true,
            createdAt: true,
            favoriteRestaurants: true,
            favoriteMenuItems: true
        }
    });

    const formattedProfile = profile
        ? {
            ...profile,
            dateOfBirth: profile.dateOfBirth
                ? `${String(profile.dateOfBirth.getDate()).padStart(2, "0")}/${String(
                    profile.dateOfBirth.getMonth() + 1
                ).padStart(2, "0")}/${profile.dateOfBirth.getFullYear()}`
                : null
        }
        : null;

    res.status(200).json(
        new ApiResponse(200, formattedProfile, "Profile fetched successfully")
    );
});

export const deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user || user.isDeleted) {
        throw new ApiError(404, "User not found.");
    }

    await prisma.user.update({
        where: {
            id: userId
        },
        data: {
            isDeleted: true,
            deletedAt: new Date()
        }
    });

    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

        if (decoded.exp) {
            const ttl = decoded.exp - Math.floor(Date.now() / 1000);

            if (ttl > 0) {
                await redis.set(`blacklist_${token}`, "true", "EX", ttl);
            }
        }
    }

    res.status(200).json(
        new ApiResponse(200, null, "Account deleted successfully.")
    );
});