import { type Response } from "express";
import { asyncHandler } from "../../utils/AsyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { type AuthRequest } from "../../middlewares/auth.middleware.js";
import prisma from "../../utils/prisma.js";
import { ApiError } from "../../utils/ApiError.js";

// Get all notifications for the logged-in user
export const getMyNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const notifications = await prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
    });

    res.status(200).json(
        new ApiResponse(200, notifications, "Notification list fetched successfully.")
    );
});

// Mark all as read
export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    await prisma.notification.updateMany({
        where: { userId: req.user.id, isRead: false },
        data: { isRead: true }
    });

    res.status(200).json(new ApiResponse(200, null, "All notifications marked as read."));
});

// Update FCM Token so Firebase knows exactly which phone to ping
export const updateFcmToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { fcmToken } = req.body;

    if (!fcmToken) {
        throw new ApiError(400, "FCM Token is required.");
    }

    await prisma.user.update({
        where: { id: req.user.id },
        data: { fcmToken }
    });

    res.status(200).json(
        new ApiResponse(200, null, "Device token updated securely for notifications.")
    );
});