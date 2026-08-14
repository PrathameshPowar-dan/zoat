import { type Response, type Request } from 'express';
import { type AuthRequest } from '../../middlewares/auth.middleware.js';
import prisma from '../../utils/prisma.js';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js'; // Import prisma namespace for type inference


// API - Recommended Food API
export const getRecommendedFood = asyncHandler(async (req: Request, res: Response) => {
    const { restaurantId, categoryId, limit = 10 } = req.query;

    const menuItems = await prisma.menuItem.findMany({
        where: {
            isAvailable: true,
            ...(restaurantId && { restaurantId: String(restaurantId) }),
            ...(categoryId && { categoryId: String(categoryId) })
        },
        orderBy: [
            // MenuItem does not have a 'rating' field. Ordering by createdAt for now.
            { createdAt: "desc" }
        ],
        take: Number(limit),
        include: {
            restaurant: {
                select: {
                    id: true,
                    name: true,
                    imageUrl: true
                }
            }
        }
    });

    res.status(200).json(
        new ApiResponse(
            200,
            menuItems,
            "Recommended food fetched successfully"
        )
    );
});

// API - Veg Menu API
export const getVegMenu = asyncHandler(async (req: Request, res: Response) => {
    const { restaurantId, limit = 10 } = req.query;
    const menuItems = await prisma.menuItem.findMany({
        where: {
            isAvailable: true,
            isVeg: true,
            ...(restaurantId && { restaurantId: String(restaurantId) })
        },
        orderBy: [
            // MenuItem does not have a 'rating' field.
        ],
        take: Number(limit),
        include: {
            restaurant: {
                select: {
                    id: true,
                    name: true,
                    imageUrl: true
                }
            }
        }
    });
    res.status(200).json(
        new ApiResponse(
            200,
            menuItems,
            "Veg menu fetched successfully"
        )
    );
});

export const getMenuByRestaurant = asyncHandler(async (req: Request, res: Response) => {
    const { restaurantId } = req.params;
    const { category } = req.query;

    const filters: any = { 
        restaurantId, 
        isAvailable: true 
    };

    if (category) {
        filters.category = category as string;
    }

    const menuItems = await prisma.menuItem.findMany({
        where: filters,
        orderBy: { name: "asc" }
    });

    res.status(200).json(
        new ApiResponse(200, menuItems, "Menu items fetched successfully.")
    );
});