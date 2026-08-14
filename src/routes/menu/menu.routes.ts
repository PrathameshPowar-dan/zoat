import { Router } from 'express';
import { getMenuByRestaurant, getRecommendedFood, getVegMenu, searchDishes } from '../../controllers/restaurant/menu.controller.js';

const router = Router();

router.get('/recommended', getRecommendedFood);
router.get('/veg', getVegMenu);
router.get('/restaurant/:restaurantId', getMenuByRestaurant);
router.get('/search', searchDishes);

export default router;
