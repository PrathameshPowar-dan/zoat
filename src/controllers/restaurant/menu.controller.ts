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

// API - Get Menu by Restaurant ID
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

// Search for dishes with Pagination and Dynamic Filters
export const searchDishes = asyncHandler(async (req: Request, res: Response) => {
    // 1. Grab everything from the URL query
    const { query, page = "1", limit = "20", isVeg, isPureVeg } = req.query;

    if (!query || typeof query !== 'string') {
        throw new ApiError(400, "Please provide a valid search query.");
    }

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // 2. Build the Base Query (Stuff that is ALWAYS required)
    const whereClause: any = {
        isAvailable: true, 
        OR: [
            { name: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } },
        ]
    };

    // 3. 🟢 THE DYNAMIC FILTERS 🟢
    
    // If the user toggles "Veg Only" for the DISH
    if (isVeg === 'true') {
        whereClause.isVeg = true;
    }

    // If the user toggles "Pure Veg Restaurants Only"
    if (isPureVeg === 'true') {
        whereClause.restaurant = {
            isPureVeg: true
        };
    }

    // 4. Execute the Query
    const dishes = await prisma.menuItem.findMany({
        where: whereClause, // <-- Pass the dynamic object here!
        include: {
            restaurant: {
                select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    rating: true,
                    isPureVeg: true
                }
            }
        },
        skip: skip,
        take: limitNumber
    });

    res.status(200).json(
        new ApiResponse(200, dishes, `Search results fetched successfully.`)
    );
});