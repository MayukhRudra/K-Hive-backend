import jwt from "jsonwebtoken";

// Generate JWT token
export const generateToken = (user) => {
  const payload = {
    userId: user.userId,
    gmailId: user.gmailId,
    name: user.name,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  return accessToken;
};

// Generate refresh token (optional, for token rotation)
export const generateRefreshToken = (user) => {
  const payload = {
    userId: user.userId,
  };

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });

  return refreshToken;
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    return null;
  }
};

// Set JWT cookie
export const setTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === "production";
  
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: isProduction, // true in production (HTTPS only)
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
};

// Set refresh token cookie (optional)
export const setRefreshTokenCookie = (res, refreshToken) => {
  const isProduction = process.env.NODE_ENV === "production";
  
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/api/auth/refresh",
  });
};

// Clear JWT cookies
export const clearTokenCookies = (res) => {
  res.clearCookie("jwt", { path: "/" });
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
};