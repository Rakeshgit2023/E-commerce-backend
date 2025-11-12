import express from "express";
import {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  deleteCategoryImage,
  toggleCategoryStatus,
  getCategoriesWithCounts,
  updateAllCategoriesCounts,
} from "../controllers/CategoryController.js";
import { protect, admin } from "../middlewares/auth.js";
import { uploadSingle } from "../middlewares/upload.js";

const router = express.Router();

// @route   GET /api/categories/with-counts
// @desc    Get categories with product counts
// @access  Public
router.get("/with-counts", getCategoriesWithCounts);

// @route   PUT /api/categories/update-all-counts
// @desc    Update all categories product count
// @access  Private/Admin
router.put("/update-all-counts", protect, admin, updateAllCategoriesCounts);

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get("/", getAllCategories);

// @route   GET /api/categories/slug/:slug
// @desc    Get category by slug
// @access  Public
router.get("/slug/:slug", getCategoryBySlug);

// @route   GET /api/categories/:id
// @desc    Get category by ID
// @access  Public
router.get("/:id", getCategoryById);

// @route   POST /api/categories
// @desc    Create category with image
// @access  Private/Admin
router.post("/", protect, admin, uploadSingle, createCategory);

// @route   PUT /api/categories/:id
// @desc    Update category with image
// @access  Private/Admin
router.put("/:id", protect, admin, uploadSingle, updateCategory);

// @route   PUT /api/categories/:id/toggle
// @desc    Toggle category status
// @access  Private/Admin
router.put("/:id/toggle", protect, admin, toggleCategoryStatus);

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private/Admin
router.delete("/:id", protect, admin, deleteCategory);

// @route   DELETE /api/categories/:id/image
// @desc    Delete category image
// @access  Private/Admin
router.delete("/:id/image", protect, admin, deleteCategoryImage);

export default router;
