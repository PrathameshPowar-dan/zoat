import { type Response } from 'express';
import prisma from '../../utils/prisma.js';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { type AuthRequest } from '../../middlewares/auth.middleware.js';

export const addAddress = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { street, city, state, zipCode, lat, lng, isDefault } = req.body;
    const userId = req.user.id;

    if (!street || !city || !state || !zipCode) {
        throw new ApiError(400, "Incomplete address details provided.");
    }

    // If this is set to default, unset any existing default addresses for this user
    if (isDefault) {
        await prisma.address.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false }
        });
    }

    const address = await prisma.address.create({
        data: { userId, street, city, state, zipCode, lat, lng, isDefault: isDefault || false }
    });

    res.status(201).json(new ApiResponse(201, address, "Address added successfully"));
});

export const getAddresses = asyncHandler(async (req: AuthRequest, res: Response) => {
    const addresses = await prisma.address.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(new ApiResponse(200, addresses, "Addresses fetched successfully"));
});