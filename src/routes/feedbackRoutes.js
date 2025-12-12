import express from "express";
import {createFeedback} from "../controllers/feedbackController.js";
import { isAuthenticated, attachUser } from "../middleware/authMiddleware.js";
import moderation from "../middleware/moderation.js";
import {feedbackRateLimit} from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

// Protected routes (require authentication)
router.post("/", isAuthenticated, feedbackRateLimit, moderation, createFeedback);


export default router;