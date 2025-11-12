import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  updateCartItem,
} from "../controllers/CartController.js";

const router = express.Router();

// @route   GET /api/cart
// @desc    Get user cart
// @access  Private
router.get("/", protect, getCart);

// @route   POST /api/cart
// @desc    Add item to cart
// @access  Private
router.post("/", protect, addToCart);

// @route   PUT /api/cart/:itemId
// @desc    Update cart item quantity
// @access  Private
router.put("/:itemId", protect, updateCartItem);

// @route   DELETE /api/cart/:itemId
// @desc    Remove item from cart
// @access  Private
router.delete("/:itemId", protect, removeFromCart);

// @route   DELETE /api/cart
// @desc    Clear cart
// @access  Private
router.delete("/", protect, clearCart);

export default router;
