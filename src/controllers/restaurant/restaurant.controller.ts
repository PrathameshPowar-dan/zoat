// src/controllers/restaurant/restaurant.controller.ts
import { type Request, type Response } from 'express';
import prisma from '../../utils/prisma.js';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

// 1. Banner API (Fetches Menu Items that have promotional images)
export const getBanners = asyncHandler(async (req: Request, res: Response) => {
    const banners = await prisma.menuItem.findMany({
        where: { 
            imageUrl: { not: null }, 
            isAvailable: true 
        },
        take: 8, // Top 8 banners for the carousel
        orderBy: { createdAt: 'desc' },
        include: { restaurant: { select: { name: true, id: true } } }
    });

    res.status(200).json(new ApiResponse(200, banners, "Banners fetched successfully"));
});

// 2. Location API (Finds restaurants within a specific radius using Haversine)
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

// 3. Recommended / Hotel List (Top Rated)
export const getRecommendedRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const restaurants = await prisma.restaurant.findMany({
        orderBy: { rating: 'desc' },
        take: limit,
        select: {
            id: true,
            name: true,
            rating: true,
            imageUrl: true,
            cuisines: true,
            costForTwo: true,
            isPureVeg: true
        }
    });

    res.status(200).json(new ApiResponse(200, restaurants, "Recommended restaurants fetched"));
});

// 4. Common Filter & Search API
export const filterRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const { isPureVeg, maxCost, cuisines, minRating, search } = req.query;

    const filterConditions: any = {};

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
        filterConditions.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { menuItems: { some: { name: { contains: search as string, mode: 'insensitive' } } } }
        ];
    }

    const restaurants = await prisma.restaurant.findMany({
        where: filterConditions,
        include: { 
            menuItems: { take: 3 } // Preview a few menu items in the search results
        },
    });

    res.status(200).json(new ApiResponse(200, restaurants, "Filtered restaurants fetched"));
});