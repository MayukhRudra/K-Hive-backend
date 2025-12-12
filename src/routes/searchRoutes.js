import express from "express";
import {
  autocomplete,
  getTagSuggestions
} from "../controllers/searchController.js";
import {searchPosts} from "../controllers/postController.js";
import { attachUser, isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/autocomplete", attachUser, autocomplete);
router.get("/tags", attachUser, getTagSuggestions);
router.get("/", attachUser, searchPosts);

export default router;