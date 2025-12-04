import { ObjectId } from "mongodb";
import mongocon from "../config/mongocon.js";
import rediscon from "../config/rediscon.js";

class Post {
  constructor(data) {
    this.postId = data.postId || new ObjectId().toString();
    this.userId = data.userId;
    this.title = data.title;
    this.content = data.content;
    this.tags = data.tags || [];
    this.upvotes = data.upvotes || 0;
    this.downvotes = data.downvotes || 0;
    this.commentIds = data.commentIds || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.isPinned = data.isPinned || false;
    this.isLocked = data.isLocked || false;
    this.viewCount = data.viewCount || 0;
  }

  // Create a new post
  static async create(postData) {
    try {
      const collection = await mongocon.postsCollection();
      if (!collection) throw new Error("Database connection failed");

      const newPost = new Post(postData);
      const result = await collection.insertOne({
        _id: newPost.postId,
        postId: newPost.postId,
        userId: newPost.userId,
        title: newPost.title,
        content: newPost.content,
        tags: newPost.tags,
        upvotes: newPost.upvotes,
        downvotes: newPost.downvotes,
        commentIds: newPost.commentIds,
        createdAt: newPost.createdAt,
        updatedAt: newPost.updatedAt,
        isPinned: newPost.isPinned,
        isLocked: newPost.isLocked,
        viewCount: newPost.viewCount,
      });

      if (result.acknowledged) {
        await rediscon.postsCacheSet(newPost.postId, newPost);
        return newPost;
      }
      throw new Error("Failed to create post");
    } catch (err) {
      console.error("Error creating post:", err.message);
      throw err;
    }
  }

  // Find post by Post ID
  static async findByPostId(postId) {
    const redisPost = await rediscon.postsCacheGet(postId);
    if (redisPost) return redisPost;

    try {
      const collection = await mongocon.postsCollection();
      if (!collection) throw new Error("Database connection failed");

      const post = await collection.findOne({ postId });
      if (post) await rediscon.postsCacheSet(postId, post);

      return post;
    } catch (err) {
      console.error("Error finding post by Post ID:", err.message);
      throw err;
    }
  }

  // Get all posts with pagination
  static async getAllPosts(page = 1, limit = 10, sortBy = "createdAt", order = -1) {
    try {
      const collection = await mongocon.postsCollection();
      if (!collection) throw new Error("Database connection failed");

      const skip = (page - 1) * limit;
      const sortOptions = { [sortBy]: order };

      const posts = await collection
        .find({})
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await collection.countDocuments({});

      // Cache fetched posts
      if (posts.length > 0) {
        const cachePairs = {};
        posts.forEach((post) => {
          cachePairs[post.postId] = post;
        });
        await rediscon.postsCacheMSet(cachePairs);
      }

      return {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      console.error("Error getting all posts:", err.message);
      throw err;
    }
  }

  // Get posts by user ID
  static async getPostsByUserId(userId, page = 1, limit = 10) {
    try {
      const collection = await mongocon.postsCollection();
      if (!collection) throw new Error("Database connection failed");

      const skip = (page - 1) * limit;

      const posts = await collection
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await collection.countDocuments({ userId });

      return {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      console.error("Error getting posts by user ID:", err.message);
      throw err;
    }
  }

  // Search posts by title or tags
  static async searchPosts(query, page = 1, limit = 10) {
    try {
      const collection = await mongocon.postsCollection();
      if (!collection) throw new Error("Database connection failed");

      const skip = (page - 1) * limit;

      const searchFilter = {
        $or: [
          { title: { $regex: query, $options: "i" } },
          { tags: { $regex: query, $options: "i" } },
        ],
      };

      const posts = await collection
        .find(searchFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await collection.countDocuments(searchFilter);

      return {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      console.error("Error searching posts:", err.message);
      throw err;
    }
  }

  // Update post
  static async updatePost(postId, updateData) {
    try {
      const collection = await mongocon.postsCollection();
      if (!collection) throw new Error("Database connection failed");

      updateData.updatedAt = new Date();

      const result = await collection.updateOne(
        { postId },
        { $set: updateData }
      );

      if (result.modifiedCount > 0) {
        await rediscon.postsCacheDel(postId);
        return await Post.findByPostId(postId);
      }

      return null;
    } catch (err) {
      console.error("Error updating post:", err.message);
      throw err;
    }
  }

  // Increment view count
  static async incrementViewCount(postId) {
    try {
      const collection = await mongocon.postsCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.updateOne(
        { postId },
        { $inc: { viewCount: 1 } }
      );

      if (result.modifiedCount > 0) {
        await rediscon.postsCacheDel(postId);
      }

      return result.modifiedCount > 0;
    } catch (err) {
      console.error("Error incrementing view count:", err.message);
      throw err;
    }
  }

  // Add upvote
  static async upvote(postId) {
    try {
      const collection = await mongocon.postsCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.updateOne(
        { postId },
        { $inc: { upvotes: 1 } }
      );

      if (result.modifiedCount > 0) {
        await rediscon.postsCacheDel(postId);
      }

      return result.modifiedCount > 0;
    } catch (err) {
      console.error("Error upvoting post:", err.message);
      throw err;
    }
  }

  // Add downvote
  static async downvote(postId) {
    try {
      const collection = await mongocon.postsCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.updateOne(
        { postId },
        { $inc: { downvotes: 1 } }
      );

      if (result.modifiedCount > 0) {
        await rediscon.postsCacheDel(postId);
      }

      return result.modifiedCount > 0;
    } catch (err) {
      console.error("Error downvoting post:", err.message);
      throw err;
    }
  }

  // Add comment ID to post's commentIds array
  static async addComment(postId, commentId) {
    try {
      const collection = await mongocon.postsCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.updateOne(
        { postId },
        { $addToSet: { commentIds: commentId } }
      );

      if (result.modifiedCount > 0) {
        await rediscon.postsCacheDel(postId);
      }

      return result.modifiedCount > 0;
    } catch (err) {
      console.error("Error adding comment to post:", err.message);
      throw err;
    }
  }

  // Remove comment ID from post's commentIds array
  static async removeComment(postId, commentId) {
    try {
      const collection = await mongocon.postsCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.updateOne(
        { postId },
        { $pull: { commentIds: commentId } }
      );

      if (result.modifiedCount > 0) {
        await rediscon.postsCacheDel(postId);
      }

      return result.modifiedCount > 0;
    } catch (err) {
      console.error("Error removing comment from post:", err.message);
      throw err;
    }
  }

  // Toggle pin status
  static async togglePin(postId) {
    try {
      const collection = await mongocon.postsCollection();
      if (!collection) throw new Error("Database connection failed");

      const post = await collection.findOne({ postId });
      if (!post) throw new Error("Post not found");

      const result = await collection.updateOne(
        { postId },
        { $set: { isPinned: !post.isPinned } }
      );

      if (result.modifiedCount > 0) {
        await rediscon.postsCacheDel(postId);
      }

      return result.modifiedCount > 0;
    } catch (err) {
      console.error("Error toggling pin status:", err.message);
      throw err;
    }
  }

  // Toggle lock status
  static async toggleLock(postId) {
    try {
      const collection = await mongocon.postsCollection();
      if (!collection) throw new Error("Database connection failed");

      const post = await collection.findOne({ postId });
      if (!post) throw new Error("Post not found");

      const result = await collection.updateOne(
        { postId },
        { $set: { isLocked: !post.isLocked } }
      );

      if (result.modifiedCount > 0) {
        await rediscon.postsCacheDel(postId);
      }

      return result.modifiedCount > 0;
    } catch (err) {
      console.error("Error toggling lock status:", err.message);
      throw err;
    }
  }

  // Delete post
  static async deletePost(postId) {
    try {
      const collection = await mongocon.postsCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.deleteOne({ postId });
      await rediscon.postsCacheDel(postId);

      return result.deletedCount > 0;
    } catch (err) {
      console.error("Error deleting post:", err.message);
      throw err;
    }
  }
}

export default Post;