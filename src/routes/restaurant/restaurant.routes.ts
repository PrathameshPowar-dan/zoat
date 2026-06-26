import { Router } from 'express';
import { 
    getBanners, 
    getCategories, 
    getRestaurantList, 
    getTopRated, 
    getRestaurantDetail,
    filterRestaurants
} from '../../controllers/restaurant/restaurant.controller.js';

const router = Router();

router.get('/banners', getBanners);
router.get('/categories', getCategories);
router.get('/list', getRestaurantList);
router.get('/top-rated', getTopRated);
router.get('/filter', filterRestaurants);
router.get('/detail/:id', getRestaurantDetail); 

export default router;