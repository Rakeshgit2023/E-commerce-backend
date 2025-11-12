import Product from "../models/Product.js";
import { catchAsyncErrors } from "../middlewares/CatchAsyncErrors.js";
import ErrorHandler from "../middlewares/ErrorMiddleWare.js";
import {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "../utils/uploadToCloudinary.js";
import User from "../models/User.js";

// @desc    Get all products with filters and pagination
// @route   GET /api/products
// @access  Public
// export const getAllProducts = catchAsyncErrors(async (req, res, next) => {
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 12;
//   const skip = (page - 1) * limit;

//   // Build query
//   let query = { isActive: true };

//   // Category filter
//   if (req.query.category) {
//     query.category = req.query.category;
//   }

//   // Age filter
//   if (req.query.age) {
//     query.age = req.query.age;
//   }

//   // Price range filter
//   if (req.query.minPrice || req.query.maxPrice) {
//     query.price = {};
//     if (req.query.minPrice) query.price.$gte = parseInt(req.query.minPrice);
//     if (req.query.maxPrice) query.price.$lte = parseInt(req.query.maxPrice);
//   }

//   // Size filter
//   if (req.query.size) {
//     query.sizes = req.query.size;
//   }

//   // Sort
//   let sort = {};
//   if (req.query.sort) {
//     switch (req.query.sort) {
//       case "price-low":
//         sort.price = 1;
//         break;
//       case "price-high":
//         sort.price = -1;
//         break;
//       case "rating":
//         sort.rating = -1;
//         break;
//       case "newest":
//         sort.createdAt = -1;
//         break;
//       default:
//         sort.createdAt = -1;
//     }
//   } else {
//     sort.createdAt = -1;
//   }

//   // Execute query
//   const products = await Product.find(query).sort(sort).limit(limit).skip(skip);

//   const total = await Product.countDocuments(query);

//   res.status(200).json({
//     success: true,
//     count: products.length,
//     total,
//     page,
//     pages: Math.ceil(total / limit),
//     products,
//   });
// });

// // @desc    Get single product by ID
// // @route   GET /api/products/:id
// // @access  Public
export const getProductById = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate(
    "reviews.user",
    "name avatar"
  );

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // 🧩 Find Related Products
  const relatedProducts = await Product.find({
    category: product.category, // same category
    _id: { $ne: product._id }, // exclude current product
  })
    .limit(4) // limit to 4 results
    .select("name price images rating category colors sizes"); // only return needed fields

  res.status(200).json({
    success: true,
    product,
    relatedProducts,
  });
});

// Get All Products with Wishlist Status
export const getAllProducts = catchAsyncErrors(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  // Build query
  let query = { isActive: true };

  // Category filter
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Age filter
  if (req.query.age) {
    query.age = req.query.age;
  }

  // Price range filter
  if (req.query.minPrice || req.query.maxPrice) {
    query.price = {};
    if (req.query.minPrice) query.price.$gte = parseInt(req.query.minPrice);
    if (req.query.maxPrice) query.price.$lte = parseInt(req.query.maxPrice);
  }

  // Size filter
  if (req.query.size) {
    query.sizes = req.query.size;
  }

  // Sort
  let sort = {};
  if (req.query.sort) {
    switch (req.query.sort) {
      case "price-low":
        sort.price = 1;
        break;
      case "price-high":
        sort.price = -1;
        break;
      case "rating":
        sort.rating = -1;
        break;
      case "newest":
        sort.createdAt = -1;
        break;
      default:
        sort.createdAt = -1;
    }
  } else {
    sort.createdAt = -1;
  }

  // Execute query
  const products = await Product.find(query).sort(sort).limit(limit).skip(skip);
  const total = await Product.countDocuments(query);

  // Get user's wishlist if authenticated
  let userWishlist = [];

  if (req.query.id) {
    const user = await User.findById(req.query.id).select("wishlist");
    userWishlist = user?.wishlist.map((id) => id.toString()) || [];
  }

  // Add isInWishlist flag to each product
  const productsWithWishlist = products.map((product) => {
    const productObj = product.toObject();
    productObj.isInWishlist = userWishlist.includes(product._id.toString());
    return productObj;
  });

  res.status(200).json({
    success: true,
    count: productsWithWishlist.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    products: productsWithWishlist,
  });
});

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
export const searchProducts = catchAsyncErrors(async (req, res, next) => {
  const { q, page = 1, limit = 20 } = req.query;

  if (!q) {
    return next(new ErrorHandler("Search query is required", 400));
  }

  // Convert to numbers
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  // Calculate skip value for pagination
  const skip = (pageNumber - 1) * limitNumber;

  // Search query
  const searchQuery = {
    $or: [
      { name: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { category: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
    ],
    isActive: true,
  };

  // Get total count for pagination info
  const totalProducts = await Product.countDocuments(searchQuery);

  // Get paginated products
  const products = await Product.find(searchQuery)
    .skip(skip)
    .limit(limitNumber);

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalProducts / limitNumber);
  const hasNextPage = pageNumber < totalPages;
  const hasPrevPage = pageNumber > 1;

  res.status(200).json({
    success: true,
    count: products.length,
    totalProducts,
    currentPage: pageNumber,
    totalPages,
    hasNextPage,
    hasPrevPage,
    products,
  });
});

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
export const getProductsByCategory = catchAsyncErrors(
  async (req, res, next) => {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const products = await Product.find({
      category,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Product.countDocuments({ category, isActive: true });

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      products,
    });
  }
);

// @desc    Create product with images
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = catchAsyncErrors(async (req, res, next) => {
  let productData = { ...req.body };

  // Parse JSON fields if they come as strings
  if (typeof productData.sizes === "string") {
    productData.sizes = JSON.parse(productData.sizes);
  }
  if (typeof productData.colors === "string") {
    productData.colors = JSON.parse(productData.colors);
  }
  if (typeof productData.tags === "string") {
    productData.tags = JSON.parse(productData.tags);
  }

  // Handle image uploads if files are present
  if (req.files && req.files.length > 0) {
    if (req.files.length > 5) {
      return next(new ErrorHandler("Maximum 5 images allowed", 400));
    }

    // Upload images to Cloudinary
    const uploadResults = await uploadMultipleToCloudinary(
      req.files,
      "dress-gallery/products"
    );

    // Store image URLs in database
    productData.images = uploadResults.map((result) => result.secure_url);
  } else if (!productData.images || productData.images.length === 0) {
    return next(
      new ErrorHandler("At least one product image is required", 400)
    );
  }

  // Calculate original price and discount if not provided
  if (!productData.originalPrice && productData.discount) {
    productData.originalPrice = Math.floor(
      productData.price / (1 - productData.discount / 100)
    );
  }

  const product = await Product.create(productData);

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    product,
  });
});

// @desc    Update product with images
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = catchAsyncErrors(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  let productData = { ...req.body };

  // Parse JSON fields if they come as strings
  if (typeof productData.sizes === "string") {
    productData.sizes = JSON.parse(productData.sizes);
  }
  if (typeof productData.colors === "string") {
    productData.colors = JSON.parse(productData.colors);
  }
  if (typeof productData.tags === "string") {
    productData.tags = JSON.parse(productData.tags);
  }

  // Handle new image uploads if files are present
  if (req.files && req.files.length > 0) {
    if (req.files.length > 5) {
      return next(new ErrorHandler("Maximum 5 images allowed", 400));
    }

    // Delete old images from Cloudinary if requested
    if (req.body.deleteOldImages === "true" && product.images.length > 0) {
      const deletePromises = product.images.map((imageUrl) => {
        try {
          const publicId = extractPublicId(imageUrl);
          return deleteFromCloudinary(publicId);
        } catch (error) {
          console.log("Error deleting image:", error.message);
          return Promise.resolve();
        }
      });
      await Promise.all(deletePromises);
    }

    // Upload new images to Cloudinary
    const uploadResults = await uploadMultipleToCloudinary(
      req.files,
      "dress-gallery/products"
    );

    // Update image URLs
    if (req.body.replaceImages === "true") {
      // Replace all images
      productData.images = uploadResults.map((result) => result.secure_url);
    } else {
      // Add to existing images
      productData.images = [
        ...product.images,
        ...uploadResults.map((result) => result.secure_url),
      ];
    }
  }

  product = await Product.findByIdAndUpdate(req.params.id, productData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Product updated successfully",
    product,
  });
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Delete images from Cloudinary
  if (product.images && product.images.length > 0) {
    const deletePromises = product.images.map((imageUrl) => {
      try {
        const publicId = extractPublicId(imageUrl);
        return deleteFromCloudinary(publicId);
      } catch (error) {
        console.log("Error deleting image:", error.message);
        return Promise.resolve();
      }
    });
    await Promise.all(deletePromises);
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
});

// @desc    Delete specific product image
// @route   DELETE /api/products/:id/images
// @access  Private/Admin
export const deleteProductImage = catchAsyncErrors(async (req, res, next) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return next(new ErrorHandler("Image URL is required", 400));
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Check if image exists in product
  if (!product.images.includes(imageUrl)) {
    return next(new ErrorHandler("Image not found in product", 404));
  }

  // Must have at least one image
  if (product.images.length <= 1) {
    return next(new ErrorHandler("Product must have at least one image", 400));
  }

  // Delete from Cloudinary
  try {
    const publicId = extractPublicId(imageUrl);
    await deleteFromCloudinary(publicId);
  } catch (error) {
    console.log("Error deleting image from Cloudinary:", error.message);
  }

  // Remove from database
  product.images = product.images.filter((img) => img !== imageUrl);
  await product.save();

  res.status(200).json({
    success: true,
    message: "Product image deleted successfully",
    product,
  });
});

// @desc    Add product review
// @route   POST /api/products/:id/reviews
// @access  Private
export const addProductReview = catchAsyncErrors(async (req, res, next) => {
  const { rating, comment } = req.body;

  if (!rating) {
    return next(new ErrorHandler("Please provide a rating", 400));
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Check if user already reviewed
  const alreadyReviewed = product.reviews.find(
    (r) => r.user.toString() === req.user.id.toString()
  );

  if (alreadyReviewed) {
    return next(new ErrorHandler("Product already reviewed", 400));
  }

  const review = {
    user: req.user.id,
    name: req.user.name,
    rating: Number(rating),
    comment: comment || "",
  };

  product.reviews.push(review);
  product.numReviews = product.reviews.length;
  product.rating =
    product.reviews.reduce((acc, item) => item.rating + acc, 0) /
    product.reviews.length;

  await product.save();

  res.status(201).json({
    success: true,
    message: "Review added successfully",
  });
});

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
export const getFeaturedProducts = catchAsyncErrors(async (req, res, next) => {
  const products = await Product.find({
    isFeatured: true,
    isActive: true,
  })
    .limit(8)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: products.length,
    products,
  });
});
