import { ObjectId } from "mongodb";
import mongocon from "../config/mongocon.js";

class User {
  constructor(data) {
    this.userId = data.userId || new ObjectId().toString();
    this.name = data.name;
    this.gmailId = data.gmailId;
    this.joinDate = data.joinDate || new Date();
    this.avatarLink = data.avatarLink || null;
    this.postIds = data.postIds || [];
    this.commentIds = data.commentIds || [];
  }

  // Create a new user
  static async create(userData) {
    try {
      const collection = await mongocon.usersCollection();
      if (!collection) throw new Error("Database connection failed");

      // Check if user already exists
      const existingUser = await collection.findOne({ gmailId: userData.gmailId });
      if (existingUser) {
        return existingUser;
      }

      const newUser = new User(userData);
      const result = await collection.insertOne({
        _id: newUser.userId,
        userId: newUser.userId,
        name: newUser.name,
        gmailId: newUser.gmailId,
        joinDate: newUser.joinDate,
        avatarLink: newUser.avatarLink,
        postIds: newUser.postIds,
        commentIds: newUser.commentIds
      });

      if (result.acknowledged) {
        return newUser;
      }
      throw new Error("Failed to create user");
    } catch (err) {
      console.error("Error creating user:", err.message);
      throw err;
    }
  }

  // Find user by Gmail ID
  static async findByGmailId(gmailId) {
    try {
      const collection = await mongocon.usersCollection();
      if (!collection) throw new Error("Database connection failed");

      const user = await collection.findOne({ gmailId });
      return user;
    } catch (err) {
      console.error("Error finding user by Gmail ID:", err.message);
      throw err;
    }
  }

  // Find user by User ID
  static async findByUserId(userId) {
    try {
      const collection = await mongocon.usersCollection();
      if (!collection) throw new Error("Database connection failed");

      const user = await collection.findOne({ userId });
      return user;
    } catch (err) {
      console.error("Error finding user by User ID:", err.message);
      throw err;
    }
  }

  // Update user
  static async updateUser(userId, updateData) {
    try {
      const collection = await mongocon.usersCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.updateOne(
        { userId },
        { $set: updateData }
      );

      if (result.modifiedCount > 0) {
        return await User.findByUserId(userId);
      }
      return null;
    } catch (err) {
      console.error("Error updating user:", err.message);
      throw err;
    }
  }

  // Add post ID to user's postIds array
  static async addPost(userId, postId) {
    try {
      const collection = await mongocon.usersCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.updateOne(
        { userId },
        { $addToSet: { postIds: postId } }
      );

      return result.modifiedCount > 0;
    } catch (err) {
      console.error("Error adding post to user:", err.message);
      throw err;
    }
  }

  // Add comment ID to user's commentIds array
  static async addComment(userId, commentId) {
    try {
      const collection = await mongocon.usersCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.updateOne(
        { userId },
        { $addToSet: { commentIds: commentId } }
      );

      return result.modifiedCount > 0;
    } catch (err) {
      console.error("Error adding comment to user:", err.message);
      throw err;
    }
  }

  // Remove post ID from user's postIds array
  static async removePost(userId, postId) {
    try {
      const collection = await mongocon.usersCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.updateOne(
        { userId },
        { $pull: { postIds: postId } }
      );

      return result.modifiedCount > 0;
    } catch (err) {
      console.error("Error removing post from user:", err.message);
      throw err;
    }
  }

  // Remove comment ID from user's commentIds array
  static async removeComment(userId, commentId) {
    try {
      const collection = await mongocon.usersCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.updateOne(
        { userId },
        { $pull: { commentIds: commentId } }
      );

      return result.modifiedCount > 0;
    } catch (err) {
      console.error("Error removing comment from user:", err.message);
      throw err;
    }
  }

  // Get all users
  static async getAllUsers() {
    try {
      const collection = await mongocon.usersCollection();
      if (!collection) throw new Error("Database connection failed");

      const users = await collection.find({}).toArray();
      return users;
    } catch (err) {
      console.error("Error getting all users:", err.message);
      throw err;
    }
  }

  // Delete user
  static async deleteUser(userId) {
    try {
      const collection = await mongocon.usersCollection();
      if (!collection) throw new Error("Database connection failed");

      const result = await collection.deleteOne({ userId });
      return result.deletedCount > 0;
    } catch (err) {
      console.error("Error deleting user:", err.message);
      throw err;
    }
  }
}

export default User;