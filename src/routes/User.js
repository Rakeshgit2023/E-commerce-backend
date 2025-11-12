import express from "express";
import { admin, protect } from "../middlewares/auth.js";
import {
  addToWishlist,
  clearWishlist,
  deleteUser,
  getAllUsers,
  getUserById,
  getUserOrders,
  getUserStatistics,
  getWishlist,
  removeFromWishlist,
  updateUser,
  updateUserRole,
  verifyUser,
} from "../controllers/UserController.js";

const router = express.Router();

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private/Admin
router.get("/stats", protect, admin, getUserStatistics);

// @route   GET /api/users/wishlist
// @desc    Get user wishlist
// @access  Private
router.get("/wishlist", protect, getWishlist);

// @route   POST /api/users/wishlist
// @desc    Add to wishlist
// @access  Private
router.post("/wishlist", protect, addToWishlist);

// @route   DELETE /api/users/wishlist
// @desc    Clear wishlist
// @access  Private
router.delete("/wishlist", protect, clearWishlist);

// @route   DELETE /api/users/wishlist/:productId
// @desc    Remove from wishlist
// @access  Private
router.delete("/wishlist/:productId", protect, removeFromWishlist);

// @route   GET /api/users
// @desc    Get all users
// @access  Private/Admin
router.get("/", protect, admin, getAllUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private/Admin
router.get("/:id", protect, admin, getUserById);

// @route   GET /api/users/:id/orders
// @desc    Get user orders
// @access  Private/Admin
router.get("/:id/orders", protect, admin, getUserOrders);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private/Admin
router.post("/update", protect, updateUser);

// @route   PUT /api/users/:id/role
// @desc    Update user role
// @access  Private/Admin
router.put("/:id/role", protect, admin, updateUserRole);

// @route   PUT /api/users/:id/verify
// @desc    Verify user email
// @access  Private/Admin
router.put("/:id/verify", protect, admin, verifyUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete("/:id", protect, admin, deleteUser);

export default router;
