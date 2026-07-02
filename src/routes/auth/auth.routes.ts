import { Router } from 'express';
import { verifyPhoneAndLogin, logout, verifyOtp, sendOtp } from '../../controllers/auth/auth.controller.js';
import { protectRoute } from '../../middlewares/auth.middleware.js';

const router = Router();

// Registration & Login
router.post('/verify-phone', verifyPhoneAndLogin);

// Logout (Requires an active token)
router.post('/logout', protectRoute, logout);


router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

export default router;