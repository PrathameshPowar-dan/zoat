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
import {
    createTableBooking,
    getDineInRestaurants,
    getMyTableBookings
} from '../../controllers/restaurant/dineIn.controller.js';
import { protectRoute } from '../../middlewares/auth.middleware.js';

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

// Dine-in table booking APIs
router.get('/dine-in/list', getDineInRestaurants);
router.post('/dine-in/bookings', protectRoute, createTableBooking);
router.get('/dine-in/bookings/me', protectRoute, getMyTableBookings);

export default router;