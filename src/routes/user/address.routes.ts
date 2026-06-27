import { Router } from 'express';
import { addAddress, getAddresses } from '../../controllers/user/address.controller.js';
import { protectRoute } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/', protectRoute, addAddress);
router.get('/', protectRoute, getAddresses);

export default router;