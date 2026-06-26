import { Router } from 'express';
import { 
    getBanners, 
    getCategories, 
    getRestaurantList, 
    getTopRated, 
    getRestaurantDetail,
    getNearbyRestaurants,
    searchRestaurants,
    filterRestaurants
} from '../../controllers/restaurant/restaurant.controller.js';

const router = Router();

// Endpoints exactly requested by your friend
router.get('/banners', getBanners);
router.get('/categories', getCategories);
router.get('/list', getRestaurantList);
router.get('/top-rated', getTopRated);
router.get('/detail/:id', getRestaurantDetail); 

// The dedicated Search API
router.get('/search', searchRestaurants);

// The Location & Filter APIs
router.get('/nearby', getNearbyRestaurants);
router.get('/filter', filterRestaurants);

export default router;