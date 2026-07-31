import { type Request, type Response } from 'express';
import prisma from '../../utils/prisma.js';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { type AuthRequest } from '../../middlewares/auth.middleware.js';

export const toggleFavoriteRestaurant = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { restaurantId } = req.body;

    if (!userId) throw new ApiError(401, 'Unauthorized');

    const existing = await prisma.favoriteRestaurant.findUnique({
        where: { userId_restaurantId: { userId, restaurantId } },
    });

    if (existing) {
        // Remove if already favorited
        await prisma.favoriteRestaurant.delete({
            where: { id: existing.id },
        });
        return res.status(200).json(new ApiResponse(200, {}, 'Restaurant removed from favorites'));
    } else {
        // Add to favorites
        const favorite = await prisma.favoriteRestaurant.create({
            data: { userId, restaurantId },
        });
        return res.status(201).json(new ApiResponse(201, favorite, 'Restaurant added to favorites'));
    }
});

export const getFavoriteRestaurants = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const favorites = await prisma.favoriteRestaurant.findMany({
        where: { userId },
        include: { restaurant: true },
    });

    return res.status(200).json(new ApiResponse(200, favorites, 'Favorite restaurants fetched successfully'));
});


// MENU ITEM FAVORITES

export const toggleFavoriteMenuItem = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { menuItemId } = req.body;

    if (!userId) throw new ApiError(401, 'Unauthorized');

    const existing = await prisma.favoriteMenuItem.findUnique({
        where: { userId_menuItemId: { userId, menuItemId } },
    });

    if (existing) {
        await prisma.favoriteMenuItem.delete({
            where: { id: existing.id },
        });
        // Optional: decrement favoriteCount on MenuItem if you track it
        await prisma.menuItem.update({
            where: { id: menuItemId },
            data: { favoriteCount: { decrement: 1 } },
        });

        return res.status(200).json(new ApiResponse(200, {}, 'Menu item removed from favorites'));
    } else {
        const favorite = await prisma.favoriteMenuItem.create({
            data: { userId, menuItemId },
        });
        await prisma.menuItem.update({
            where: { id: menuItemId },
            data: { favoriteCount: { increment: 1 } },
        });

        return res.status(201).json(new ApiResponse(201, favorite, 'Menu item added to favorites'));
    }
});

export const getFavoriteMenuItems = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const favorites = await prisma.favoriteMenuItem.findMany({
        where: { userId },
        include: { menuItem: true },
    });

    return res.status(200).json(new ApiResponse(200, favorites, 'Favorite menu items fetched successfully'));
});