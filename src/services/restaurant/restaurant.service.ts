import prisma from "../../utils/prisma.js";

class RestaurantService {
    async getRestaurantMenu(restaurantId: string) {
        const restaurant = await prisma.restaurant.findUnique({
            where: {
                id: restaurantId,
            },
        });

        if (!restaurant) {
            throw new Error("Restaurant not found.");
        }

        return prisma.menuItem.findMany({
            where: {
                restaurantId,
                isAvailable: true,
            },
            orderBy: [
                {
                    isFeatured: "desc",
                },
                {
                    averageRating: "desc",
                },
                {
                    orderCount: "desc",
                },
                {
                    name: "asc",
                },
            ],
            select: {
                id: true,
                name: true,
                category: true,
                price: true,
                isVeg: true,
                imageUrl: true,
                isAvailable: true,
                isFeatured: true,
                averageRating: true,
                totalRatings: true,
                orderCount: true,
            },
        });
    }
}

export default new RestaurantService();