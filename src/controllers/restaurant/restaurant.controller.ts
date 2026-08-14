import { type Request, type Response } from 'express';
import prisma from '../../utils/prisma.js';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import restaurantService from '../../services/restaurant/restaurant.service.js';

// API - Banner API (Fetches promotional background banners)
export const getBanners = asyncHandler(async (req: Request, res: Response) => {
    const banners = await prisma.banner.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(new ApiResponse(200, banners, "Banners fetched successfully"));
});

// API - Category List API (Fetches Chinese, Indian, etc. with images)
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
    });
    res.status(200).json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

// API - Restaurant List API (Standard list of all restaurants)
export const getRestaurantList = asyncHandler(async (req: Request, res: Response) => {
    const restaurants = await prisma.restaurant.findMany({
        select: {
            id: true, name: true, rating: true, imageUrl: true,
            cuisines: true, costForTwo: true, isPureVeg: true, address: true,
            supportsDineIn: true, dineInCapacity: true
        }
    });
    res.status(200).json(new ApiResponse(200, restaurants, "Restaurant list fetched"));
});

// API - Top Rated API
export const getTopRated = asyncHandler(async (req: Request, res: Response) => {
    const restaurants = await prisma.restaurant.findMany({
        orderBy: { rating: 'desc' },
        take: 10,
        select: {
            id: true, name: true, rating: true, imageUrl: true, cuisines: true, costForTwo: true
        }
    });
    res.status(200).json(new ApiResponse(200, restaurants, "Top rated restaurants fetched"));
});

// API - Restaurant Detail API (Gets a specific restaurant + its full menu)
export const getRestaurantDetail = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
        where: { id: String(id) },
        include: { menuItems: { where: { isAvailable: true } } }
    });

    if (!restaurant) throw new ApiError(404, "Restaurant not found");
    res.status(200).json(new ApiResponse(200, restaurant, "Restaurant details fetched"));
});

// API - Nearby Restaurants API
export const getNearbyRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const { lat, lng, radiusInKm = 5 } = req.query;

    if (!lat || !lng) throw new ApiError(400, "Latitude and Longitude are required query parameters");

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radius = parseFloat(radiusInKm as string);

    // Using Raw SQL for the complex mathematical radius calculation
    const nearbyRestaurants = await prisma.$queryRaw`
        SELECT id, name, address, rating, "imageUrl", "isPureVeg", "costForTwo",
        (
            6371 * acos(
                cos(radians(${latitude})) * cos(radians(lat)) * cos(radians(lng) - radians(${longitude})) + 
                sin(radians(${latitude})) * sin(radians(lat))
            )
        ) AS distance
        FROM "Restaurant"
        WHERE lat IS NOT NULL AND lng IS NOT NULL
        AND (
            6371 * acos(
                cos(radians(${latitude})) * cos(radians(lat)) * cos(radians(lng) - radians(${longitude})) + 
                sin(radians(${latitude})) * sin(radians(lat))
            )
        ) <= ${radius}
        ORDER BY distance ASC;
    `;

    res.status(200).json(new ApiResponse(200, nearbyRestaurants, `Restaurants within ${radius}km fetched`));
});

// API - Search Restaurants API
export const searchRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const { restaurantName } = req.query;

    if (!restaurantName) {
        res.status(200).json(new ApiResponse(200, [], "Please provide a search term (restaurantName)"));
        return;
    }

    const searchTerm = restaurantName as string;

    const restaurants = await prisma.restaurant.findMany({
        where: {
            OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } }, // Matches Restaurant Name
            ]
        }
    });

    res.status(200).json(new ApiResponse(200, restaurants, "Search results fetched"));
});

// API - Advanced Filters API
export const filterRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const {
        search,
        cuisines,
        minRating,
        maxCost,
        isPureVeg,
        supportsDineIn,
        categoryId: rawCategoryId, // Rename to avoid conflict and clarify
        minPrice,
        maxPrice,
        sortBy,
        page = "1",
        limit = "10"
    } = req.query;

    // Ensure categoryId is a single string or undefined, as expected by Prisma's categoryId field
    const categoryId = Array.isArray(rawCategoryId) ? rawCategoryId[0] : rawCategoryId;

    const where: any = {};

    // Restaurant Filters
    if (isPureVeg === "true") {
        where.isPureVeg = true;
    }

    if (supportsDineIn === "true") {
        where.supportsDineIn = true;
    }

    if (minRating) {
        where.rating = {
            gte: Number(minRating)
        };
    }

    if (maxCost) {
        where.costForTwo = {
            lte: Number(maxCost)
        };
    }

    if (cuisines) {
        where.cuisines = {
            hasSome: (cuisines as string).split(",")
        };
    }

    // Search Restaurant Name OR Menu Item Name
    if (search) {
        where.OR = [
            {
                name: {
                    contains: String(search),
                    mode: "insensitive"
                }
            },
            {
                menuItems: {
                    some: {
                        name: {
                            contains: String(search),
                            mode: "insensitive"
                        }
                    }
                }
            }
        ];
    }

    // Menu Filters
    if (categoryId || minPrice || maxPrice) {
        where.menuItems = {
            some: {
                ...(categoryId && { // Use the processed categoryId
                    categoryId: String(categoryId)
                }),

                ...(minPrice || maxPrice
                    ? {
                        price: {
                            ...(minPrice && {
                                gte: Number(minPrice)
                            }),
                            ...(maxPrice && {
                                lte: Number(maxPrice)
                            })
                        }
                    }
                    : {})
            }
        };
    }

    const orderBy: any = {};

    switch (sortBy) {
        case "rating":
            orderBy.rating = "desc";
            break;

        case "cost_low":
            orderBy.costForTwo = "asc";
            break;

        case "cost_high":
            orderBy.costForTwo = "desc";
            break;

        case "newest":
            orderBy.createdAt = "desc";
            break;

        case "name":
            orderBy.name = "asc";
            break;

        default:
            orderBy.rating = "desc";
    }

    const restaurants = await prisma.restaurant.findMany({
        where,
        orderBy,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
            menuItems: {
                where: {
                    isAvailable: true,
                    ...(categoryId && { // Use the processed categoryId
                        categoryId: String(categoryId)
                    }),
                    ...(search && {
                        name: {
                            contains: String(search),
                            mode: "insensitive"
                        }
                    }),
                    ...(minPrice || maxPrice
                        ? {
                            price: {
                                ...(minPrice && {
                                    gte: Number(minPrice)
                                }),
                                ...(maxPrice && {
                                    lte: Number(maxPrice)
                                })
                            }
                        }
                        : {})
                },
                take: 5
            }
        }
    });

    const total = await prisma.restaurant.count({
        where
    });

    res.status(200).json(
        new ApiResponse(
            200,
            {
                total,
                page: Number(page),
                limit: Number(limit),
                restaurants
            },
            "Filtered restaurants fetched successfully."
        )
    );
});

// API - Restaurants Menu API
export const getRestaurantMenu = asyncHandler(async (req, res: Response) => {
    const menu = await restaurantService.getRestaurantMenu(
        req.params.restaurantId as string
    );

    res.status(200).json(
        new ApiResponse(
            200,
            menu,
            "Restaurant menu fetched successfully."
        )
    );
});

// API - Category Wise Restaurants API
export const getCategoryWiseRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isPureVeg } = req.query;

    const category = await prisma.category.findUnique({
        where: { id: id as string },
        select: { name: true }
    });

    if (!category) {
        throw new ApiError(404, "Category not found");
    }

    const whereClause: any = {
        cuisines: { has: category.name }
    };
    
    if (isPureVeg === 'true') {
        whereClause.isPureVeg = true;
    } else if (isPureVeg === 'false') {
        whereClause.isPureVeg = false; // Optional: Allows fetching ONLY non-veg places
    }

    const restaurants = await prisma.restaurant.findMany({
        where: whereClause,
    });

    res.status(200).json(
        new ApiResponse(
            200,
            restaurants,
            "Restaurants for the specified category fetched successfully."
        )
    );
});

// API - Pure Veg Restaurants API
export const getPureVegRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const restaurants = await prisma.restaurant.findMany({
        where: { isPureVeg: true },
        select: {
            id: true, name: true, rating: true, imageUrl: true,
            cuisines: true, costForTwo: true, address: true
        }
    });

    res.status(200).json(new ApiResponse(200, restaurants, "Pure Veg restaurants fetched successfully"));
});

// API - Top Rated Pure Veg Restaurants API
export const getTopRatedVegRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const pureVegRestaurants = await prisma.restaurant.findMany({
        where: { 
            isPureVeg: true 
        },
        orderBy: { 
            rating: "desc"
        },
        take: limit
    });

    res.status(200).json(
        new ApiResponse(200, pureVegRestaurants, "Top rated pure veg restaurants fetched successfully.")
    );
});