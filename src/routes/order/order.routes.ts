import { Router } from 'express';
import { checkout, getMyOrders } from '../../controllers/order/order.controller.js';
import { protectRoute } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/checkout', protectRoute, checkout);
router.get('/history', protectRoute, getMyOrders);

export default router;