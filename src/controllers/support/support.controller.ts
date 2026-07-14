import { type Response } from "express";
import prisma from "../../utils/prisma.js";
import { asyncHandler } from "../../utils/AsyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { type AuthRequest } from "../../middlewares/auth.middleware.js";

export const createSupportTicket = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const { subject, message } = req.body;

        if (!subject?.trim()) {
            throw new ApiError(400, "Subject is required");
        }

        if (!message?.trim()) {
            throw new ApiError(400, "Message is required");
        }

        const ticket = await prisma.supportTicket.create({
            data: {
                userId: req.user.id,
                subject: subject.trim(),
                message: message.trim()
            }
        });

        res.status(201).json(
            new ApiResponse(
                201,
                ticket,
                "Support ticket created successfully"
            )
        );
    }
);

export const getMySupportTickets = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const tickets = await prisma.supportTicket.findMany({
            where: {
                userId: req.user.id
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        res.status(200).json(
            new ApiResponse(
                200,
                tickets,
                "Support tickets fetched successfully"
            )
        );
    }
);

export const getSupportTicket = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const { id } = req.params;

        const ticket = await prisma.supportTicket.findFirst({
            where: {
                id: id as string,
                userId: req.user.id
            }
        });

        if (!ticket) {
            throw new ApiError(404, "Support ticket not found");
        }

        res.status(200).json(
            new ApiResponse(
                200,
                ticket,
                "Support ticket fetched successfully"
            )
        );
    }
);