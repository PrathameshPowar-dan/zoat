import { type Request, type Response } from 'express';
import prisma from '../../utils/prisma.js';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { type AuthRequest } from '../../middlewares/auth.middleware.js';

const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED'] as const;

const getHourRange = (input: Date): { start: Date; end: Date } => {
    const start = new Date(input);
    start.setMinutes(0, 0, 0);

    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    return { start, end };
};

export const getDineInRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const { partySize, bookingDateTime } = req.query;

    const parsedPartySize = partySize ? Number.parseInt(String(partySize), 10) : undefined;
    if (parsedPartySize !== undefined && (Number.isNaN(parsedPartySize) || parsedPartySize <= 0)) {
        throw new ApiError(400, 'partySize must be a positive integer');
    }

    let requestedDate: Date | undefined;
    if (bookingDateTime) {
        requestedDate = new Date(String(bookingDateTime));
        if (Number.isNaN(requestedDate.getTime())) {
            throw new ApiError(400, 'bookingDateTime must be a valid ISO date string');
        }
    }

    const restaurants = await prisma.restaurant.findMany({
        where: {
            supportsDineIn: true,
            ...(parsedPartySize ? { dineInCapacity: { gte: parsedPartySize } } : {})
        },
        select: {
            id: true,
            name: true,
            rating: true,
            imageUrl: true,
            cuisines: true,
            costForTwo: true,
            address: true,
            openingHours: true,
            dineInCapacity: true
        },
        orderBy: { rating: 'desc' }
    });

    if (!requestedDate) {
        res.status(200).json(new ApiResponse(200, restaurants, 'Dine-in restaurants fetched'));
        return;
    }

    const { start, end } = getHourRange(requestedDate);

    const bookingsByRestaurant = await prisma.tableBooking.groupBy({
        by: ['restaurantId'],
        where: {
            status: { in: [...ACTIVE_BOOKING_STATUSES] },
            bookingDateTime: {
                gte: start,
                lt: end
            },
            restaurantId: {
                in: restaurants.map((restaurant) => restaurant.id)
            }
        },
        _sum: {
            partySize: true
        }
    });

    const bookedSeatsMap = new Map<string, number>(
        bookingsByRestaurant.map((entry) => [entry.restaurantId, entry._sum.partySize ?? 0])
    );

    const withAvailability = restaurants.map((restaurant) => {
        const bookedSeats = bookedSeatsMap.get(restaurant.id) ?? 0;
        const availableSeats = typeof restaurant.dineInCapacity === 'number'
            ? Math.max(restaurant.dineInCapacity - bookedSeats, 0)
            : null;

        return {
            ...restaurant,
            bookedSeats,
            availableSeats
        };
    });

    res.status(200).json(new ApiResponse(200, withAvailability, 'Dine-in restaurants fetched with seat availability'));
});

export const createTableBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { restaurantId, bookingDateTime, partySize, specialRequest } = req.body;

    if (!restaurantId || !bookingDateTime || !partySize) {
        throw new ApiError(400, 'restaurantId, bookingDateTime and partySize are required');
    }

    const parsedPartySize = Number.parseInt(String(partySize), 10);
    if (Number.isNaN(parsedPartySize) || parsedPartySize <= 0) {
        throw new ApiError(400, 'partySize must be a positive integer');
    }

    const bookingDate = new Date(String(bookingDateTime));
    if (Number.isNaN(bookingDate.getTime())) {
        throw new ApiError(400, 'bookingDateTime must be a valid ISO date string');
    }

    if (bookingDate <= new Date()) {
        throw new ApiError(400, 'bookingDateTime must be in the future');
    }

    const restaurant = await prisma.restaurant.findUnique({
        where: { id: String(restaurantId) },
        select: { id: true, name: true, supportsDineIn: true, dineInCapacity: true }
    });

    if (!restaurant) {
        throw new ApiError(404, 'Restaurant not found');
    }

    if (!restaurant.supportsDineIn) {
        throw new ApiError(400, 'This restaurant does not accept dine-in bookings');
    }

    if (typeof restaurant.dineInCapacity === 'number' && parsedPartySize > restaurant.dineInCapacity) {
        throw new ApiError(400, 'Party size exceeds this restaurant capacity');
    }

    const { start, end } = getHourRange(bookingDate);

    const existingBookingByUserAtThatTime = await prisma.tableBooking.findFirst({
        where: {
            userId: req.user.id,
            restaurantId: restaurant.id,
            bookingDateTime: {
                gte: start,
                lt: end
            },
            status: { in: [...ACTIVE_BOOKING_STATUSES] }
        }
    });

    if (existingBookingByUserAtThatTime) {
        throw new ApiError(409, 'You already have an active booking at this restaurant for this time slot.');
    }

    const existingSeats = await prisma.tableBooking.aggregate({
        where: {
            restaurantId: restaurant.id,
            status: { in: [...ACTIVE_BOOKING_STATUSES] },
            bookingDateTime: {
                gte: start,
                lt: end
            }
        },
        _sum: { partySize: true }
    });


    const alreadyBookedSeats = existingSeats._sum.partySize ?? 0;
    const maxCapacity = restaurant.dineInCapacity;

    if (typeof maxCapacity === 'number' && alreadyBookedSeats + parsedPartySize > maxCapacity) {
        throw new ApiError(409, 'Not enough dine-in seats available for selected slot');
    }

    const booking = await prisma.tableBooking.create({
        data: {
            userId: req.user.id,
            restaurantId: restaurant.id,
            bookingDateTime: bookingDate,
            partySize: parsedPartySize,
            specialRequest: specialRequest ? String(specialRequest) : null,
            status: 'PENDING'
        },
        include: {
            restaurant: {
                select: {
                    id: true,
                    name: true,
                    address: true,
                    imageUrl: true
                }
            }
        }
    });

    res.status(201).json(new ApiResponse(201, booking, 'Table booking created successfully'));
});

export const getMyTableBookings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const bookings = await prisma.tableBooking.findMany({
        where: { userId: req.user.id },
        orderBy: { bookingDateTime: 'asc' },
        include: {
            restaurant: {
                select: {
                    id: true,
                    name: true,
                    address: true,
                    imageUrl: true,
                    openingHours: true
                }
            }
        }
    });

    res.status(200).json(new ApiResponse(200, bookings, 'Dine-in bookings fetched'));
});
