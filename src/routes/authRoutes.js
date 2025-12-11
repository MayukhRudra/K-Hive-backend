import express from "express";
import passport from "../config/passport.js";
import { isAuthenticated, isNotAuthenticated } from "../middleware/authMiddleware.js";
import {
  googleCallback,
  getCurrentUser,
  logout,
  checkAuth,
  refreshToken,
  updateUser,
} from "../controllers/authController.js";
import {
  loginRateLimit,
  userUpdateRateLimit
} from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.get(
  "/google",
  isNotAuthenticated,
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
    session: false,
  }),
  loginRateLimit,
  googleCallback
);

router.get("/user", isAuthenticated, userUpdateRateLimit, getCurrentUser);

router.put("/user", isAuthenticated, updateUser);

router.get("/check", checkAuth);

router.post("/refresh", refreshToken);

router.post("/logout", isAuthenticated, logout);

export default router;