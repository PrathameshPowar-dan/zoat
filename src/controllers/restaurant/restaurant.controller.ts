// src/controllers/restaurant/restaurant.controller.ts
import { type Request, type Response } from 'express';
import prisma from '../../utils/prisma.js';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

// Banner API (Fetches Menu Items that have promotional images)
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

// Location API (Finds restaurants within a specific radius using Haversine)
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

// Hotel List
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

// Common Filter & Search API
export const filterRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const { isPureVeg, maxCost, cuisines, minRating, search } = req.query;

    const filterConditions: any = {};
    let menuItemsFilter: any = { take: 10 }; // Default: show 10 items

    if (isPureVeg === 'true') filterConditions.isPureVeg = true;
    if (maxCost) filterConditions.costForTwo = { lte: parseInt(maxCost as string) };
    if (minRating) filterConditions.rating = { gte: parseFloat(minRating as string) };
    
    if (cuisines) {
        const cuisineList = (cuisines as string).split(',');
        filterConditions.cuisines = { hasSome: cuisineList };
    }
    
    if (search) {
        const searchTerm = search as string;
        filterConditions.OR = [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { menuItems: { some: { name: { contains: searchTerm, mode: 'insensitive' } } } }
        ];

        // If there is a search term, explicitly return the menu items that match it!
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

    const results = restaurants.map(restaurant => {
        if (search && restaurant.menuItems.length === 0) {
        }
        return restaurant;
    });

    res.status(200).json(new ApiResponse(200, results, "Filtered restaurants fetched"));
});