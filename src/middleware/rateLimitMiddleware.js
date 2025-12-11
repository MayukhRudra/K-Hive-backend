// middleware/rateLimitMiddleware.js
import {
  checkPostCreationLimit,
  checkPostUpdateLimit,
  checkVotingLimit,
  checkCommentCreationLimit,
  checkCommentUpdateLimit,
  checkMediaUploadLimit,
  checkLoginLimit,
  checkUserUpdateLimit
} from "../config/redisRateLimitHandler.js";

/**
 * Rate limit middleware for post creation
 */
export async function postCreationRateLimit(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id?.toString();
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    const result = await checkPostCreationLimit(userId);
    
    if (!result.allowed) {
      res.set("Retry-After", String(result.retryAfter));
      return res.status(429).json({
        success: false,
        message: "Too many posts created. Please try again later.",
        retryAfter: result.retryAfter
      });
    }

    next();
  } catch (err) {
    console.error("Post creation rate limit error:", err.message);
    // Fail open - allow the request if middleware fails
    next();
  }
}

/**
 * Rate limit middleware for post updates
 */
export async function postUpdateRateLimit(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id?.toString();
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    const result = await checkPostUpdateLimit(userId);
    
    if (!result.allowed) {
      res.set("Retry-After", String(result.retryAfter));
      return res.status(429).json({
        success: false,
        message: "Too many post updates. Please try again later.",
        retryAfter: result.retryAfter
      });
    }

    next();
  } catch (err) {
    console.error("Post update rate limit error:", err.message);
    // Fail open - allow the request if middleware fails
    next();
  }
}

/**
 * Rate limit middleware for voting
 */
export async function votingRateLimit(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id?.toString();
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    const result = await checkVotingLimit(userId);
    
    if (!result.allowed) {
      res.set("Retry-After", String(result.retryAfter));
      return res.status(429).json({
        success: false,
        message: "Too many votes. Please slow down.",
        retryAfter: result.retryAfter
      });
    }

    next();
  } catch (err) {
    console.error("Voting rate limit error:", err.message);
    // Fail open - allow the request if middleware fails
    next();
  }
}

/**
 * Rate limit middleware for comment creation
 */
export async function commentCreationRateLimit(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id?.toString();
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    const result = await checkCommentCreationLimit(userId);
    
    if (!result.allowed) {
      res.set("Retry-After", String(result.retryAfter));
      return res.status(429).json({
        success: false,
        message: "Too many comments created. Please try again later.",
        retryAfter: result.retryAfter
      });
    }

    next();
  } catch (err) {
    console.error("Comment creation rate limit error:", err.message);
    // Fail open - allow the request if middleware fails
    next();
  }
}

/**
 * Rate limit middleware for comment updates
 */
export async function commentUpdateRateLimit(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id?.toString();
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    const result = await checkCommentUpdateLimit(userId);
    
    if (!result.allowed) {
      res.set("Retry-After", String(result.retryAfter));
      return res.status(429).json({
        success: false,
        message: "Too many comment updates. Please try again later.",
        retryAfter: result.retryAfter
      });
    }

    next();
  } catch (err) {
    console.error("Comment update rate limit error:", err.message);
    // Fail open - allow the request if middleware fails
    next();
  }
}

/**
 * Rate limit middleware for media upload credential requests
 */
export async function mediaUploadRateLimit(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id?.toString();
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    const result = await checkMediaUploadLimit(userId);
    
    if (!result.allowed) {
      res.set("Retry-After", String(result.retryAfter));
      return res.status(429).json({
        success: false,
        message: "Too many upload requests. Please try again later.",
        retryAfter: result.retryAfter
      });
    }

    next();
  } catch (err) {
    console.error("Media upload rate limit error:", err.message);
    // Fail open - allow the request if middleware fails
    next();
  }
}

/**
 * Rate limit middleware for login attempts
 * Uses IP address or email as identifier
 */
export async function loginRateLimit(req, res, next) {
  try {
    // Use email from OAuth profile or IP address as fallback
    const identifier = req.user?.email || 
                      req.ip || 
                      req.headers['x-forwarded-for']?.split(',')[0] || 
                      'unknown';

    const result = await checkLoginLimit(identifier);
    
    if (!result.allowed) {
      res.set("Retry-After", String(result.retryAfter));
      return res.status(429).json({
        success: false,
        message: "Too many login attempts. Please try again later.",
        retryAfter: result.retryAfter
      });
    }

    next();
  } catch (err) {
    console.error("Login rate limit error:", err.message);
    // Fail open - allow the request if middleware fails
    next();
  }
}

/**
 * Rate limit middleware for user profile updates
 */
export async function userUpdateRateLimit(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id?.toString();
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    const result = await checkUserUpdateLimit(userId);
    
    if (!result.allowed) {
      res.set("Retry-After", String(result.retryAfter));
      return res.status(429).json({
        success: false,
        message: "Too many profile updates. Please try again later.",
        retryAfter: result.retryAfter
      });
    }

    next();
  } catch (err) {
    console.error("User update rate limit error:", err.message);
    // Fail open - allow the request if middleware fails
    next();
  }
}

export default {
  postCreationRateLimit,
  postUpdateRateLimit,
  votingRateLimit,
  commentCreationRateLimit,
  commentUpdateRateLimit,
  mediaUploadRateLimit,
  loginRateLimit,
  userUpdateRateLimit
};