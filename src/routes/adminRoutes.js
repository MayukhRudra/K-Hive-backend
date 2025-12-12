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
  incrementScore,
  rebuildIndex,
  getIndexStatus
} from "../controllers/searchController.js";

const router = express.Router();

// All routes require admin authentication
router.use(isAdmin);

// Post management routes
router.patch("/posts/:postId/pin", togglePinPost);
router.patch("/posts/:postId/lock", toggleLockPost);
router.delete("/posts/:postId", deleteAnyPost);

// Search Routes
router.post("/search-index/rebuild", rebuildIndex);
router.post("/search-index/increment", incrementScore);
router.get("/search-index/status", getIndexStatus);

// User management routes
// router.get("/users", getAllUsers);
router.get("/users/:userId/toggleban", toggleBanUser);

// Dashboard routes
router.get("/dashboard/stats", getDashboardStats);

export default router;