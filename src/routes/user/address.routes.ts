import { Router } from 'express';
import { addAddress, getAddresses, getAddressesForCheckout } from '../../controllers/user/address.controller.js';
import { protectRoute } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/', protectRoute, addAddress);
router.get('/', protectRoute, getAddresses);
router.get('/checkout-serviceability', protectRoute, getAddressesForCheckout);

export default router;