import { Router } from "express";
import {
    createSupportTicket,
    getMySupportTickets,
    getSupportTicket
} from "../../controllers/support/support.controller.js";
import { protectRoute } from "../../middlewares/auth.middleware.js";
import { getPrivacyPolicy } from "../../controllers/support/privacy.controller.js";

const router = Router();

router.post("/", protectRoute, createSupportTicket);
router.get("/", protectRoute, getMySupportTickets);
router.get("/:id", protectRoute, getSupportTicket);
router.get("/privacy-policy", getPrivacyPolicy);

export default router;