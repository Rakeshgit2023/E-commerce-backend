import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductsByCategory,
  addProductReview,
  deleteProductImage,
  getFeaturedProducts,
} from "../controllers/ProductController.js";
import { protect, admin } from "../middlewares/auth.js";
import { uploadMultiple } from "../middlewares/upload.js";

const router = express.Router();

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get("/featured", getFeaturedProducts);

// @route   GET /api/products/search
// @desc    Search products
// @access  Public
router.get("/search", searchProducts);

// @route   GET /api/products/category/:category
// @desc    Get products by category
// @access  Public
router.get("/category/:category", getProductsByCategory);

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get("/", getAllProducts);

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get("/:id", getProductById);

// @route   POST /api/products
// @desc    Create product with images
// @access  Private/Admin
router.post("/", protect, admin, uploadMultiple, createProduct);

// @route   PUT /api/products/:id
// @desc    Update product with images
// @access  Private/Admin
router.put("/:id", protect, admin, uploadMultiple, updateProduct);

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private/Admin
router.delete("/:id", protect, admin, deleteProduct);

// @route   DELETE /api/products/:id/images
// @desc    Delete specific product image
// @access  Private/Admin
router.delete("/:id/images", protect, admin, deleteProductImage);

// @route   POST /api/products/:id/reviews
// @desc    Add product review
// @access  Private
router.post("/:id/reviews", protect, addProductReview);

export default router;
