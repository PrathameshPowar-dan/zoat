import { Router } from 'express';
import { 
    getBanners, 
    getNearbyRestaurants, 
    getRecommendedRestaurants, 
    filterRestaurants 
} from '../../controllers/restaurant/restaurant.controller.js';

const router = Router();

router.get('/banners', getBanners);
router.get('/nearby', getNearbyRestaurants);
router.get('/recommended', getRecommendedRestaurants);
router.get('/filter', filterRestaurants);

export default router;