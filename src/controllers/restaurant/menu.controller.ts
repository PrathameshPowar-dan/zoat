import { type Response, type Request } from 'express';
import { type AuthRequest } from '../../middlewares/auth.middleware.js';
import prisma from '../../utils/prisma.js';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js'; // Import prisma namespace for type inference

export const getRecommendedFood = asyncHandler(async (req: Request, res: Response) => {
    const { restaurantId, categoryId, limit = 10 } = req.query;

    const menuItems = await prisma.menuItem.findMany({
        where: {
            isAvailable: true,
            ...(restaurantId && { restaurantId: String(restaurantId) }),
            ...(categoryId && { categoryId: String(categoryId) })
        },
        orderBy: [
            { rating: "desc" },
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