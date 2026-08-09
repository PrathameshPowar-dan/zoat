import prisma from "../../utils/prisma.js"
import { ApiError } from "../../utils/ApiError.js";
import { OrderStatus } from "../../constants/index.js";

class OrderService {
    async checkout(data: {
        userId: string;
        restaurantId: string;
        addressId?: string;
        orderType?: 'DELIVERY' | 'TAKEAWAY';
        tipAmount?: number;
        items: {
            menuItemId: string;
            quantity: number;
        }[];
    }) {
        // Set defaults if the frontend forgets to send them
        const { userId, restaurantId, addressId, items, orderType = 'DELIVERY', tipAmount = 0 } = data;

        if (!restaurantId || !items?.length) {
            throw new ApiError(400, "Restaurant ID and items are required.");
        }

        // Using a transaction ensures that if anything fails, NO partial data is saved
        return prisma.$transaction(async (tx) => {
            // Fetch the restaurant early to ensure it exists AND to get its name for Takeaway
            const restaurant = await tx.restaurant.findUnique({
                where: { id: restaurantId },
                select: { name: true }
            });

            if (!restaurant) {
                throw new ApiError(404, "Restaurant not found.");
            }

            // Set Address Logic based on Order Type
            let deliveryAddressStr = null;

            if (orderType === 'DELIVERY') {
                if (!addressId) {
                    throw new ApiError(400, "Delivery address is required for DELIVERY orders.");
                }

                // FIX: Changed findUnique to findFirst
                const address = await tx.address.findFirst({
                    where: { id: addressId, userId },
                });

                if (!address) {
                    throw new ApiError(404, "Invalid delivery address.");
                }

                deliveryAddressStr = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
            } else if (orderType === 'TAKEAWAY') {
                deliveryAddressStr = `Self-Pickup from ${restaurant.name}`;
            }

            // Price Calculation
            const menuItemIds = items.map((i) => i.menuItemId);

            const validMenuItems = await tx.menuItem.findMany({
                where: {
                    id: { in: menuItemIds },
                    restaurantId,
                    isAvailable: true
                }
            });

            if (validMenuItems.length !== items.length) {
                throw new ApiError(400, "Some items in your cart are unavailable.");
            }

            // Calculate just the food cost
            let foodTotal = 0;
            const orderItemsData = items.map((cartItem) => {
                const dbItem = validMenuItems.find(item => item.id === cartItem.menuItemId);
                const price = dbItem?.price || 0;

                foodTotal += (price * cartItem.quantity);

                return {
                    menuItemId: cartItem.menuItemId,
                    quantity: cartItem.quantity,
                    priceAtTimeOfOrder: price
                };
            });

            // Determine Delivery Fee
            // If they pick it up themselves, fee is 0. If we deliver, standard ₹40 fee.
            const deliveryFee = orderType === 'DELIVERY' ? 40 : 0;

            //Calculate the Grand Total
            const finalTotalAmount = foodTotal + deliveryFee + tipAmount;

            // Create the Order with the new Financial Breakdown
            const newOrder = await tx.order.create({
                data: {
                    userId,
                    restaurantId,
                    orderType,
                    deliveryAddress: deliveryAddressStr,
                    itemTotal: foodTotal,          // <-- Saves food cost 
                    deliveryFee: deliveryFee,      // <-- Saves delivery fee
                    tipAmount: tipAmount,          // <-- Saves rider tip separately!
                    totalAmount: finalTotalAmount, // <-- Grand total
                    status: 'PENDING',
                    items: {
                        create: orderItemsData
                    }
                },
                include: {
                    items: { include: { menuItem: { select: { name: true, imageUrl: true } } } },
                    restaurant: { select: { name: true, imageUrl: true, address: true } }
                }
            });

            return newOrder;
        });
    }

    async getMyOrders(userId: string) {
        return prisma.order.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                    },
                },
                items: {
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async getOrderById(orderId: string, userId: string) {
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
            },
            include: {
                restaurant: true,
                items: {
                    include: {
                        menuItem: true,
                    },
                },
                statusHistory: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });

        if (!order) {
            throw new ApiError(404, "Order not found.");
        }

        return order;
    }

    async getRestaurantOrders(restaurantId: string) {
        return prisma.order.findMany({
            where: {
                restaurantId,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
                items: {
                    include: {
                        menuItem: true,
                    },
                },
            },
        });
    }

    async updateOrderStatus(
        orderId: string,
        expectedStatus: OrderStatus,
        nextStatus: OrderStatus
    ) {
        return prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: {
                    id: orderId,
                },
                include: {
                    items: true,
                },
            });

            if (!order) {
                throw new ApiError(404, "Order not found.");
            }

            if (order.status !== expectedStatus) {
                throw new ApiError(
                    400,
                    `Order must be ${expectedStatus} before changing to ${nextStatus}.`
                );
            }

            const updatedOrder = await tx.order.update({
                where: {
                    id: orderId,
                },
                data: {
                    status: nextStatus,
                    statusHistory: {
                        create: {
                            status: nextStatus,
                        },
                    },
                },
                include: {
                    restaurant: true,
                    items: {
                        include: {
                            menuItem: true,
                        },
                    },
                    statusHistory: {
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                },
            });

            if (nextStatus === OrderStatus.DELIVERED) {
                for (const item of order.items) {
                    await tx.menuItem.update({
                        where: {
                            id: item.menuItemId,
                        },
                        data: {
                            orderCount: {
                                increment: item.quantity,
                            },
                        },
                    });
                }
            }

            return updatedOrder;
        });
    }

    async acceptOrder(orderId: string) {
        return this.updateOrderStatus(
            orderId,
            OrderStatus.PENDING,
            OrderStatus.ACCEPTED
        );
    }

    async rejectOrder(orderId: string) {
        return this.updateOrderStatus(
            orderId,
            OrderStatus.PENDING,
            OrderStatus.REJECTED
        );
    }

    async markPreparing(orderId: string) {
        return this.updateOrderStatus(
            orderId,
            OrderStatus.ACCEPTED,
            OrderStatus.PREPARING
        );
    }

    async markReadyForPickup(orderId: string) {
        return this.updateOrderStatus(
            orderId,
            OrderStatus.PREPARING,
            OrderStatus.READY_FOR_PICKUP
        );
    }

    async markOutForDelivery(orderId: string) {
        return this.updateOrderStatus(
            orderId,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.OUT_FOR_DELIVERY
        );
    }

    async markDelivered(orderId: string) {
        return this.updateOrderStatus(
            orderId,
            OrderStatus.OUT_FOR_DELIVERY,
            OrderStatus.DELIVERED
        );
    }

    async cancelOrder(orderId: string) {
        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
        });

        if (!order) {
            throw new ApiError(404, "Order not found.");
        }

        if (
            order.status !== OrderStatus.PENDING &&
            order.status !== OrderStatus.ACCEPTED
        ) {
            throw new ApiError(
                400,
                "This order can no longer be cancelled."
            );
        }

        return this.updateOrderStatus(
            orderId,
            order.status as OrderStatus,
            OrderStatus.CANCELLED
        );
    }
}

export default new OrderService();