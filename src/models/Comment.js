import { ObjectId } from "mongodb";
import mongocon from "../config/mongocon.js";
import rediscon from "../config/rediscon.js";

class Comment {
  constructor(data) {
    this.commentId = data.commentId || new ObjectId().toString();
    this.postId = data.postId;
    this.userId = data.userId;
    this.content = data.content;
    this.parentCommentId = data.parentCommentId || null; // For nested replies
    this.upvotes = data.upvotes || 0;
    this.downvotes = data.downvotes || 0;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.isEdited = data.isEdited || false;
    this.isDeleted = data.isDeleted || false;
  }

  // Create a new comment
  static async create(commentData) {
    try {
      const collection = await mongocon.commentsCollection();
      if (!collection) throw new Error("Database connection failed");

      const newComment = new Comment(commentData);
      const result = await collection.insertOne({
        _id: newComment.commentId,
        commentId: newComment.commentId,
        postId: newComment.postId,
        userId: newComment.userId,
        content: newComment.content,
        parentCommentId: newComment.parentCommentId,
        upvotes: newComment.upvotes,
        downvotes: newComment.downvotes,
        createdAt: newComment.createdAt,
        updatedAt: newComment.updatedAt,
        isEdited: newComment.isEdited,
        isDeleted: newComment.isDeleted,
      });

      if (result.acknowledged) {
        await rediscon.commentsCacheSet(newComment.commentId, newComment);
        return newComment;
      }
      throw new Error("Failed to create comment");
    } catch (err) {
      console.error("Error creating comment:", err.message);
      throw err;
    }
  }

  // Find comment by Comment ID
  static async findByCommentId(commentId) {
    const redisComment = await rediscon.commentsCacheGet(commentId);
    if (redisComment) return redisComment;

    try {
      const collection = await mongocon.commentsCollection();
      if (!collection) throw new Error("Database connection failed");

      const comment = await collection.findOne({ commentId });
      if (comment) await rediscon.commentsCacheSet(commentId, comment);

      return comment;
    } catch (err) {
      console.error("Error finding comment by Comment ID:", err.message);
      throw err;
    }
  }

  // Get comments by post ID with pagination
  static async getCommentsByPostId(postId, page = 1, limit = 20) {
    try {
      const collection = await mongocon.commentsCollection();
      if (!collection) throw new Error("Database connection failed");

      const skip = (page - 1) * limit;

      // Get top-level comments (no parent)
      const comments = await collection
        .find({ postId, parentCommentId: null, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await collection.countDocuments({
        postId,
        parentCommentId: null,
        isDeleted: false,
      });

      // Cache fetched comments
      if (comments.length > 0) {
        const cachePairs = {};
        comments.forEach((comment) => {
          cachePairs[comment.commentId] = comment;
        });
        await rediscon.commentsCacheMSet(cachePairs);
      }

      return {
        comments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      console.error("Error getting comments by post ID:", err.message);
      throw err;
    }
  }

  // Get replies to a specific comment
  static async getRepliesByCommentId(parentCommentId, page = 1, limit = 10) {
    try {
      const collection = await mongocon.commentsCollection();
      if (!collection) throw new Error("Database connection failed");

      const skip = (page - 1) * limit;

      const replies = await collection
        .find({ parentCommentId, isDeleted: false })
        .sort({ createdAt: 1 }) // Oldest first for replies
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await collection.countDocuments({
        parentCommentId,
        isDeleted: false,
      });

      // Cache fetched replies
      if (replies.length > 0) {
        const cachePairs = {};
        replies.forEach((reply) => {
          cachePairs[reply.commentId] = reply;
        });
        await rediscon.commentsCacheMSet(cachePairs);
      }

      return {
        replies,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      console.error("Error getting replies by comment ID:", err.message);
      throw err;
    }
  }

  // Get comments by user ID
  static async getCommentsByUserId(userId, page = 1, limit = 20) {
    try {
      const collection = await mongocon.commentsCollection();
      if (!collection) throw new Error("Database connection failed");

      const skip = (page - 1) * limit;

      const comments = await collection
        .find({ userId, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await collection.countDocuments({
        userId,
        isDeleted: false,
      });

      return {
        comments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      console.error("Error getting comments by user ID:", err.message);
      throw err;
    }
  }

  // Update comment
  static async updateComment(commentId, content) {
    try {
      const collection = await mongocon.commentsCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.updateOne(
        { commentId },
        {
          $set: {
            content,
            updatedAt: new Date(),
            isEdited: true,
          },
        }
      );

      if (result.modifiedCount > 0) {
        await rediscon.commentsCacheDel(commentId);
        return await Comment.findByCommentId(commentId);
      }

      return null;
    } catch (err) {
      console.error("Error updating comment:", err.message);
      throw err;
    }
  }

  // Add upvote
  static async upvote(commentId) {
    try {
      const collection = await mongocon.commentsCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.updateOne(
        { commentId },
        { $inc: { upvotes: 1 } }
      );

      if (result.modifiedCount > 0) {
        await rediscon.commentsCacheDel(commentId);
      }

      return result.modifiedCount > 0;
    } catch (err) {
      console.error("Error upvoting comment:", err.message);
      throw err;
    }
  }

  // Add downvote
  static async downvote(commentId) {
    try {
      const collection = await mongocon.commentsCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.updateOne(
        { commentId },
        { $inc: { downvotes: 1 } }
      );

      if (result.modifiedCount > 0) {
        await rediscon.commentsCacheDel(commentId);
      }

      return result.modifiedCount > 0;
    } catch (err) {
      console.error("Error downvoting comment:", err.message);
      throw err;
    }
  }

  // Soft delete comment (mark as deleted but keep data)
  static async softDeleteComment(commentId) {
    try {
      const collection = await mongocon.commentsCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.updateOne(
        { commentId },
        {
          $set: {
            isDeleted: true,
            content: "[deleted]",
            updatedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount > 0) {
        await rediscon.commentsCacheDel(commentId);
      }

      return result.modifiedCount > 0;
    } catch (err) {
      console.error("Error soft deleting comment:", err.message);
      throw err;
    }
  }

  // Hard delete comment (permanently remove)
  static async hardDeleteComment(commentId) {
    try {
      const collection = await mongocon.commentsCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.deleteOne({ commentId });
      await rediscon.commentsCacheDel(commentId);

      return result.deletedCount > 0;
    } catch (err) {
      console.error("Error hard deleting comment:", err.message);
      throw err;
    }
  }

  // Get comment count for a post
  static async getCommentCountByPostId(postId) {
    try {
      const collection = await mongocon.commentsCollection();
      if (!collection) throw new Error("Database connection failed");

      const count = await collection.countDocuments({
        postId,
        isDeleted: false,
      });

      return count;
    } catch (err) {
      console.error("Error getting comment count:", err.message);
      throw err;
    }
  }

  // Get reply count for a comment
  static async getReplyCountByCommentId(parentCommentId) {
    try {
      const collection = await mongocon.commentsCollection();
      if (!collection) throw new Error("Database connection failed");

      const count = await collection.countDocuments({
        parentCommentId,
        isDeleted: false,
      });

      return count;
    } catch (err) {
      console.error("Error getting reply count:", err.message);
      throw err;
    }
  }

  // Delete all comments for a post (cascade delete)
  static async deleteCommentsByPostId(postId) {
    try {
      const collection = await mongocon.commentsCollection();
      if (!collection) throw new Error("Database connection failed");

      // Get all comment IDs first to clear cache
      const comments = await collection.find({ postId }).toArray();
      const commentIds = comments.map((c) => c.commentId);

      // Delete from database
      const result = await collection.deleteMany({ postId });

      // Clear cache for all deleted comments
      for (const commentId of commentIds) {
        await rediscon.commentsCacheDel(commentId);
      }

      return result.deletedCount;
    } catch (err) {
      console.error("Error deleting comments by post ID:", err.message);
      throw err;
    }
  }
}

export default Comment;