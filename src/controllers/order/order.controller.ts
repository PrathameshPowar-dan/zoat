import { type Response } from "express";
import { asyncHandler } from "../../utils/AsyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { type AuthRequest } from "../../middlewares/auth.middleware.js";
import orderService from "../../services/order/order.service.js";

export const checkout = asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await orderService.checkout({
        userId: req.user.id,
        restaurantId: req.body.restaurantId,
        addressId: req.body.addressId,
        orderType: req.body.orderType,
        tipAmount: req.body.tipAmount,
        items: req.body.items,
    });

    res.status(201).json(
        new ApiResponse(
            201,
            order,
            "Order placed successfully."
        )
    );
});

export const getMyOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const orders = await orderService.getMyOrders(req.user.id);

    res.status(200).json(
        new ApiResponse(
            200,
            orders,
            "Orders fetched successfully."
        )
    );
});

export const getOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await orderService.getOrderById(
        req.params.orderId as string,
        req.user.id
    );

    res.status(200).json(
        new ApiResponse(
            200,
            order,
            "Order fetched successfully."
        )
    );
});

export const getRestaurantOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const orders = await orderService.getRestaurantOrders(
        req.params.restaurantId as string
    );

    res.status(200).json(
        new ApiResponse(
            200,
            orders,
            "Restaurant orders fetched successfully."
        )
    );
});