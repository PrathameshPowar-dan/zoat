import { Router } from 'express';
import { getRecommendedFood, getVegMenu } from '../../controllers/restaurant/menu.controller.js';

const router = Router();

router.get('/recommended', getRecommendedFood);
router.get('/veg', getVegMenu);

export default router;
