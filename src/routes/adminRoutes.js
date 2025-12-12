import express from "express";
import {
  togglePinPost,
  toggleLockPost,
  deleteAnyPost,
  getDashboardStats,
  toggleBanUser,
} from "../controllers/adminController.js";
import { isAdmin } from "../middleware/adminMiddleware.js";
import {
  getAllFeedback,
  getFeedbackByTimeRange,
  getFeedbackByUserId,
  getFeedbackById,
  deleteFeedback,} from "../controllers/feedbackController.js";

const router = express.Router();

// All routes require admin authentication
router.use(isAdmin);

// Post management routes
router.patch("/posts/:postId/pin", togglePinPost);
router.patch("/posts/:postId/lock", toggleLockPost);
router.delete("/posts/:postId", deleteAnyPost);

// User management routes
//router.get("/users", getAllUsers);
router.put("/users/:userId/toggleban", toggleBanUser);

// Feedback routes
router.get("/feedback/get-all", getAllFeedback);
router.get("/feedback/time-range", getFeedbackByTimeRange);
router.get("/feedback/user/:userId", getFeedbackByUserId);
router.get("/feedback/:feedbackId", getFeedbackById);
router.delete("/feedback/:feedbackId", deleteFeedback);

// Dashboard routes
router.get("/dashboard/stats", getDashboardStats);

export default router;