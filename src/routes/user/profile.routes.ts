import { Router } from 'express';
import { updateProfile, getProfile, deleteAccount } from '../../controllers/user/profile.controller.js';
import { protectRoute } from '../../middlewares/auth.middleware.js';
import { getMyNotifications, markAsRead, updateFcmToken } from '../../controllers/user/notification.controller.js';

const router = Router();

router.put('/', protectRoute, updateProfile);
router.get('/', protectRoute, getProfile);
router.delete('/', protectRoute, deleteAccount);
router.get('/notifications', protectRoute, getMyNotifications);
router.patch('/notifications/read', protectRoute, markAsRead);
router.patch('/fcm-token', protectRoute, updateFcmToken);


export default router;