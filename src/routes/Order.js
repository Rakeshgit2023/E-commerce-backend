import express from "express";

import {
  cancelOrder,
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderToPaid,
} from "../controllers/OrderController.js";
import { admin, protect } from "../middlewares/auth.js";

const router = express.Router();

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post("/", protect, createOrder);

// @route   GET /api/orders/myorders
// @desc    Get logged in user orders
// @access  Private
router.get("/myorders", protect, getMyOrders);

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get("/:id", protect, getOrderById);

// @route   PUT /api/orders/:id/pay
// @desc    Update order to paid
// @access  Private
router.put("/:id/pay", protect, updateOrderToPaid);

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put("/:id/status", protect, admin, updateOrderStatus);

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put("/:id/cancel", protect, cancelOrder);

// @route   GET /api/orders
// @desc    Get all orders
// @access  Private/Admin
router.get("/", protect, admin, getAllOrders);

export default router;
