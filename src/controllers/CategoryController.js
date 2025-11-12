import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { catchAsyncErrors } from "../middlewares/CatchAsyncErrors.js";
import ErrorHandler from "../middlewares/ErrorMiddleWare.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "../utils/uploadToCloudinary.js";

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getAllCategories = catchAsyncErrors(async (req, res, next) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: categories.length,
    categories,
  });
});

// @desc    Get category by ID
// @route   GET /api/categories/:id
// @access  Public
export const getCategoryById = catchAsyncErrors(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new ErrorHandler("Category not found", 404));
  }

  // Get product count
  const productCount = await Product.countDocuments({
    category: category.slug,
    isActive: true,
  });

  res.status(200).json({
    success: true,
    category: {
      ...category.toObject(),
      productCount,
    },
  });
});

// @desc    Get category by slug
// @route   GET /api/categories/slug/:slug
// @access  Public
export const getCategoryBySlug = catchAsyncErrors(async (req, res, next) => {
  const category = await Category.findOne({ slug: req.params.slug });

  if (!category) {
    return next(new ErrorHandler("Category not found", 404));
  }

  // Get product count
  const productCount = await Product.countDocuments({
    category: category.slug,
    isActive: true,
  });

  res.status(200).json({
    success: true,
    category: {
      ...category.toObject(),
      productCount,
    },
  });
});

// @desc    Create category with image
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = catchAsyncErrors(async (req, res, next) => {
  let categoryData = { ...req.body };

  if (!categoryData.name || !categoryData.slug) {
    return next(new ErrorHandler("Please provide category name and slug", 400));
  }

  // Check if category already exists
  const categoryExists = await Category.findOne({
    $or: [{ name: categoryData.name }, { slug: categoryData.slug }],
  });

  if (categoryExists) {
    return next(
      new ErrorHandler("Category with this name or slug already exists", 400)
    );
  }

  // Handle image upload if file is present
  if (req.file) {
    const uploadResult = await uploadToCloudinary(
      req.file,
      "dress-gallery/categories"
    );
    categoryData.image = uploadResult.secure_url;
  }

  const category = await Category.create(categoryData);

  res.status(201).json({
    success: true,
    message: "Category created successfully",
    category,
  });
});

// @desc    Update category with image
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = catchAsyncErrors(async (req, res, next) => {
  let category = await Category.findById(req.params.id);

  if (!category) {
    return next(new ErrorHandler("Category not found", 404));
  }

  let categoryData = { ...req.body };

  // Check if new slug already exists
  if (categoryData.slug && categoryData.slug !== category.slug) {
    const slugExists = await Category.findOne({ slug: categoryData.slug });
    if (slugExists) {
      return next(
        new ErrorHandler("Category with this slug already exists", 400)
      );
    }
  }

  // Handle new image upload if file is present
  if (req.file) {
    // Delete old image from Cloudinary if exists
    if (category.image) {
      try {
        const publicId = extractPublicId(category.image);
        await deleteFromCloudinary(publicId);
      } catch (error) {
        console.log("Error deleting old category image:", error.message);
      }
    }

    // Upload new image
    const uploadResult = await uploadToCloudinary(
      req.file,
      "dress-gallery/categories"
    );
    categoryData.image = uploadResult.secure_url;
  }

  category = await Category.findByIdAndUpdate(req.params.id, categoryData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    category,
  });
});

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = catchAsyncErrors(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new ErrorHandler("Category not found", 404));
  }

  // Check if category has products
  const productsCount = await Product.countDocuments({
    category: category.slug,
  });

  if (productsCount > 0) {
    return next(
      new ErrorHandler(
        `Cannot delete category. It has ${productsCount} products associated with it`,
        400
      )
    );
  }

  // Delete image from Cloudinary if exists
  if (category.image) {
    try {
      const publicId = extractPublicId(category.image);
      await deleteFromCloudinary(publicId);
    } catch (error) {
      console.log("Error deleting category image:", error.message);
    }
  }

  await category.deleteOne();

  res.status(200).json({
    success: true,
    message: "Category deleted successfully",
  });
});

// @desc    Delete category image
// @route   DELETE /api/categories/:id/image
// @access  Private/Admin
export const deleteCategoryImage = catchAsyncErrors(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new ErrorHandler("Category not found", 404));
  }

  if (!category.image) {
    return next(new ErrorHandler("Category has no image", 400));
  }

  // Delete from Cloudinary
  try {
    const publicId = extractPublicId(category.image);
    await deleteFromCloudinary(publicId);
  } catch (error) {
    console.log("Error deleting category image:", error.message);
  }

  // Remove from database
  category.image = null;
  await category.save();

  res.status(200).json({
    success: true,
    message: "Category image deleted successfully",
    category,
  });
});

// @desc    Toggle category status (active/inactive)
// @route   PUT /api/categories/:id/toggle
// @access  Private/Admin
export const toggleCategoryStatus = catchAsyncErrors(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new ErrorHandler("Category not found", 404));
  }

  category.isActive = !category.isActive;
  await category.save();

  res.status(200).json({
    success: true,
    message: `Category ${
      category.isActive ? "activated" : "deactivated"
    } successfully`,
    category,
  });
});

// @desc    Get categories with product count
// @route   GET /api/categories/with-counts
// @access  Public
export const getCategoriesWithCounts = catchAsyncErrors(
  async (req, res, next) => {
    const categories = await Category.find({ isActive: true });

    // Get product count for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          category: category.slug,
          isActive: true,
        });

        return {
          ...category.toObject(),
          productCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: categoriesWithCounts.length,
      categories: categoriesWithCounts,
    });
  }
);

// @desc    Update all categories product count
// @route   PUT /api/categories/update-all-counts
// @access  Private/Admin
export const updateAllCategoriesCounts = catchAsyncErrors(
  async (req, res, next) => {
    const categories = await Category.find();

    for (const category of categories) {
      const productCount = await Product.countDocuments({
        category: category.slug,
        isActive: true,
      });

      category.productCount = productCount;
      await category.save();
    }

    res.status(200).json({
      success: true,
      message: "All category product counts updated successfully",
      count: categories.length,
    });
  }
);
