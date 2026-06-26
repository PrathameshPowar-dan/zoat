import { type Request, type Response } from 'express';
import prisma from '../../utils/prisma.js';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

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
            id: true,
            name: true,
            rating: true,
            imageUrl: true,
            cuisines: true,
            costForTwo: true,
            isPureVeg: true,
            address: true
        }
    });
    res.status(200).json(new ApiResponse(200, restaurants, "Restaurant list fetched"));
});

// API - Top Rated API
export const getTopRated = asyncHandler(async (req: Request, res: Response) => {
    const restaurants = await prisma.restaurant.findMany({
        orderBy: { rating: 'desc' },
        take: 10, // Returns top 10
        select: {
            id: true, 
            name: true, 
            rating: true, 
            imageUrl: true, 
            cuisines: true, 
            costForTwo: true
        }
    });
    res.status(200).json(new ApiResponse(200, restaurants, "Top rated restaurants fetched"));
});

// API - Restaurant Detail API (Gets a specific restaurant + its full menu)
export const getRestaurantDetail = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
        where: { id: String(id) },
        include: {
            menuItems: {
                where: { isAvailable: true }
            }
        }
    });

    if (!restaurant) {
        throw new ApiError(404, "Restaurant not found");
    }

    res.status(200).json(new ApiResponse(200, restaurant, "Restaurant details fetched"));
});

// API - Location API (Finds restaurants within a specific radius using Haversine)
export const getNearbyRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const { lat, lng, radiusInKm = 5 } = req.query;

    if (!lat || !lng) {
        throw new ApiError(400, "Latitude and Longitude are required query parameters");
    }

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

// API - Common Filter & Search API
export const filterRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const { isPureVeg, maxCost, cuisines, minRating, search } = req.query;

    const filterConditions: any = {};
    let menuItemsFilter: any = { take: 3 }; // show 3 items preview

    // Apply specific filters if they exist in the query parameters
    if (isPureVeg === 'true') filterConditions.isPureVeg = true;
    if (maxCost) filterConditions.costForTwo = { lte: parseInt(maxCost as string) };
    if (minRating) filterConditions.rating = { gte: parseFloat(minRating as string) };
    
    if (cuisines) {
        // e.g., ?cuisines=Chinese,Italian
        const cuisineList = (cuisines as string).split(',');
        filterConditions.cuisines = { hasSome: cuisineList };
    }
    
    // Allow searching by Restaurant Name OR Menu Item Name
    if (search) {
        const searchTerm = search as string;
        filterConditions.OR = [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { menuItems: { some: { name: { contains: searchTerm, mode: 'insensitive' } } } }
        ];

        // If there is a search term, explicitly return the menu items that match it
        menuItemsFilter = {
            where: { name: { contains: searchTerm, mode: 'insensitive' } },
            take: 10
        };
    }

    const restaurants = await prisma.restaurant.findMany({
        where: filterConditions,
        include: { 
            menuItems: menuItemsFilter 
        },
    });

    res.status(200).json(new ApiResponse(200, restaurants, "Filtered restaurants fetched"));
});