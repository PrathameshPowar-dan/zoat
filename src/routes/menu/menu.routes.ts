import { Router } from 'express';
import { getRecommendedFood } from '../../controllers/restaurant/menu.controller.js';

const router = Router();

router.get('/recommended', getRecommendedFood);

export default router;
