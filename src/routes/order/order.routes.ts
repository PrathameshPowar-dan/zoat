import { Router } from "express";
import {
    checkout,
    getMyOrders,
    getOrderById,
    getRestaurantOrders,
} from "../../controllers/order/order.controller.js";
import { protectRoute } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(protectRoute);

// Customer
router.post("/checkout", checkout);
router.get("/my-orders", getMyOrders);
router.get("/:orderId", getOrderById);

// Restaurant
router.get("/restaurant/:restaurantId", getRestaurantOrders);

export default router;