import { Router } from 'express';
import {
    toggleFavoriteRestaurant,
    getFavoriteRestaurants,
    toggleFavoriteMenuItem,
    getFavoriteMenuItems
} from '../../controllers/user/favorite.controller.js';
import { protectRoute } from '../../middlewares/auth.middleware.js';

const router = Router();

// All favorite routes require authentication
router.use(protectRoute);

router.route('/restaurants').post(toggleFavoriteRestaurant).get(getFavoriteRestaurants);
router.route('/menu-items').post(toggleFavoriteMenuItem).get(getFavoriteMenuItems);

export default router;