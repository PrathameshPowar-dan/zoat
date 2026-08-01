import { type Response } from 'express';
import prisma from '../../utils/prisma.js';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { type AuthRequest } from '../../middlewares/auth.middleware.js';
import { calculateDistance } from '../../utils/distance.js';

export const addAddress = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { street, label, phone, receiverName, landmark, city, state, zipCode, lat, lng, isDefault } = req.body;
    const userId = req.user.id;

    if (!street || !city || !state || !zipCode || !phone || !receiverName) {
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
        data: { userId, street, label, phone, receiverName, landmark, city, state, zipCode, lat, lng, isDefault: isDefault || false }
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

export const getAddressesForCheckout = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { restaurantId } = req.query;

    if (!userId) throw new ApiError(401, 'Unauthorized');
    if (!restaurantId) throw new ApiError(400, 'Restaurant ID is required');

    const restaurant = await prisma.restaurant.findUnique({
        where: { id: String(restaurantId) },
        select: { lat: true, lng: true }
    });

    if (!restaurant || !restaurant.lat || !restaurant.lng) {
        throw new ApiError(404, 'Restaurant coordinates not found. Cannot determine delivery serviceability.');
    }

    const userAddresses = await prisma.address.findMany({
        where: { userId }
    });

    // Set your maximum delivery radius (e.g., 7 km)
    const MAX_DELIVERY_RADIUS_KM = 7;

    const deliversTo: Array<typeof userAddresses[0] & { isServiceable: boolean; distanceStr: string }> = [];
    const doesNotDeliverTo: Array<typeof userAddresses[0] & { isServiceable: boolean; distanceStr: string }> = [];

    userAddresses.forEach(address => {
        if (!address.lat || !address.lng) {
            doesNotDeliverTo.push({
                ...address,
                isServiceable: false,
                distanceStr: 'Unknown distance'
            });
            return;
        }

        const distance = calculateDistance(
            restaurant.lat!,
            restaurant.lng!,
            address.lat,
            address.lng
        );

        const roundedDistance = Math.round(distance);

        if (distance <= MAX_DELIVERY_RADIUS_KM) {
            deliversTo.push({
                ...address,
                isServiceable: true,
                distanceStr: `${roundedDistance} km`
            });
        } else {
            doesNotDeliverTo.push({
                ...address,
                isServiceable: false,
                distanceStr: `${roundedDistance} km`
            });
        }
    });

    return res.status(200).json(
        new ApiResponse(200, { deliversTo, doesNotDeliverTo }, 'Addresses categorized successfully')
    );
});