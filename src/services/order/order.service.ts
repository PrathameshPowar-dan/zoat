import prisma from "../../utils/prisma.js"
import { ApiError } from "../../utils/ApiError.js";
import { OrderStatus } from "../../constants/index.js";

class OrderService {
    async checkout(data: {
        userId: string;
        restaurantId: string;
        addressId: string;
        items: {
            menuItemId: string;
            quantity: number;
        }[];
    }) {
        const { userId, restaurantId, addressId, items } = data;

        if (!restaurantId || !items?.length || !addressId) {
            throw new ApiError(
                400,
                "Restaurant ID, items, and delivery address are required."
            );
        }

        return prisma.$transaction(async (tx) => {
            const address = await tx.address.findUnique({
                where: {
                    id: addressId,
                    userId,
                },
            });

            if (!address) {
                throw new ApiError(404, "Invalid delivery address.");
            }

            const deliveryAddress = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;

            const menuItemIds = items.map((i) => i.menuItemId);

            const validMenuItems = await tx.menuItem.findMany({
                where: {
                    id: {
                        in: menuItemIds,
                    },
                    restaurantId,
                    isAvailable: true,
                },
            });

            if (validMenuItems.length !== items.length) {
                throw new ApiError(
                    400,
                    "Some items are unavailable or belong to another restaurant."
                );
            }

            let totalAmount = 0;

            const orderItems = items.map((cartItem) => {
                const dbItem = validMenuItems.find(
                    (i) => i.id === cartItem.menuItemId
                );

                if (!dbItem) {
                    throw new ApiError(400, "Invalid menu item.");
                }

                totalAmount += dbItem.price * cartItem.quantity;

                return {
                    menuItemId: dbItem.id,
                    quantity: cartItem.quantity,
                    priceAtTimeOfOrder: dbItem.price,
                };
            });

            const order = await tx.order.create({
                data: {
                    userId,
                    restaurantId,
                    deliveryAddress,
                    totalAmount,
                    status: OrderStatus.PENDING,
                    items: {
                        create: orderItems,
                    },
                    orderStatusHistories: {
                        create: {
                            status: "PENDING",
                        },
                    },
                },
                include: {
                    restaurant: {
                        select: {
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

            return order;
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
                orderStatusHistories: {
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
                        fullName: true,
                        phoneNumber: true,
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
                    orderStatusHistories: {
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
                    orderStatusHistories: {
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