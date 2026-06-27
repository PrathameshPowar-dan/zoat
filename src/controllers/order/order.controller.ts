// src/controllers/order/order.controller.ts
import { type Response } from 'express';
import prisma from '../../utils/prisma.js';
import { asyncHandler } from '../../utils/AsyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { type AuthRequest } from '../../middlewares/auth.middleware.js';

export const checkout = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { restaurantId, items, addressId } = req.body;
    const userId = req.user.id;

    // 1. Basic Validation
    if (!restaurantId || !items || items.length === 0 || !addressId) {
        throw new ApiError(400, "Restaurant ID, items, and delivery address are required.");
    }

    // 2. Fetch the Address and format it as a string for the order record
    const address = await prisma.address.findUnique({ where: { id: addressId, userId } });
    if (!address) throw new ApiError(404, "Invalid delivery address.");
    const deliveryAddressStr = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;

    // 3. Secure Price Calculation (Fetch real prices from DB)
    const menuItemIds = items.map((item: any) => item.menuItemId);
    const validMenuItems = await prisma.menuItem.findMany({
        where: { id: { in: menuItemIds }, restaurantId, isAvailable: true }
    });

    if (validMenuItems.length !== items.length) {
        throw new ApiError(400, "Some items in your cart are unavailable or belong to a different restaurant.");
    }

    let totalAmount = 0;
    const orderItemsData = items.map((cartItem: any) => {
        const dbItem = validMenuItems.find(item => item.id === cartItem.menuItemId);
        const price = dbItem?.price || 0;
        
        totalAmount += (price * cartItem.quantity);

        return {
            menuItemId: cartItem.menuItemId,
            quantity: cartItem.quantity,
            priceAtTimeOfOrder: price // Locks in the price forever
        };
    });

    // 4. Create the Order using a Prisma Transaction
    const newOrder = await prisma.order.create({
        data: {
            userId,
            restaurantId,
            deliveryAddress: deliveryAddressStr,
            totalAmount,
            status: 'PENDING',
            items: {
                create: orderItemsData
            }
        },
        include: {
            items: { include: { menuItem: { select: { name: true, imageUrl: true } } } },
            restaurant: { select: { name: true, imageUrl: true } }
        }
    });

    res.status(201).json(new ApiResponse(201, newOrder, "Order placed successfully. Waiting for restaurant to accept."));
});

export const getMyOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const orders = await prisma.order.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
            restaurant: { select: { name: true, imageUrl: true } },
            items: { select: { quantity: true, priceAtTimeOfOrder: true, menuItem: { select: { name: true } } } }
        }
    });

    res.status(200).json(new ApiResponse(200, orders, "Order history fetched"));
});