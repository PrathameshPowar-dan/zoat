import { Router } from 'express';
import { updateProfile, getProfile, deleteAccount } from '../../controllers/user/profile.controller.js';
import { protectRoute } from '../../middlewares/auth.middleware.js';

const router = Router();

router.put('/', protectRoute, updateProfile);
router.get('/', protectRoute, getProfile);
router.delete('/', protectRoute, deleteAccount);


export default router;