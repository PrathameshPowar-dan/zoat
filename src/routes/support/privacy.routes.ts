import { Router } from "express";
import { getPrivacyPolicy } from "../../controllers/support/privacy.controller.js";

const router = Router();

router.get("/privacy-policy", getPrivacyPolicy);

export default router;