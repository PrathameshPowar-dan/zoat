import { Router } from 'express';
import { verifyFirebaseAndLogin } from '../controllers/auth.controller.js';
import { protectRoute, AuthRequest } from '../middlewares/auth.middleware.js';

const router = Router();

// Public route: Verify Firebase token and issue custom JWT
router.post('/verify', verifyFirebaseAndLogin);

// Example of a protected route to test if the middleware works
router.get('/me', protectRoute, (req: AuthRequest, res) => {
    res.status(200).json({
        status: 'success',
        data: req.user
    });
});

export default router;