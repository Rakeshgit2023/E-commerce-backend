import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { catchAsyncErrors } from "../middlewares/CatchAsyncErrors.js";
import ErrorHandler from "../middlewares/ErrorMiddleWare.js";

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = catchAsyncErrors(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build query
  let query = {};

  // Search by name or email
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
    ];
  }

  // Filter by role
  if (req.query.role) {
    query.role = req.query.role;
  }

  // Filter by verification status
  if (req.query.isVerified !== undefined) {
    query.isVerified = req.query.isVerified === "true";
  }

  const users = await User.find(query)
    .select("-password")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    users,
  });
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select("-password")
    .populate("wishlist");

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Get user's order statistics
  const orders = await Order.find({ user: req.params.id });
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0);

  res.status(200).json({
    success: true,
    user: {
      ...user.toObject(),
      statistics: {
        totalOrders,
        totalSpent,
        wishlistItems: user.wishlist.length,
      },
    },
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Don't allow updating password through this route
  if (req.body.password) {
    return next(
      new ErrorHandler("Password cannot be updated through this route", 400)
    );
  }

  const updatedUser = await User.findByIdAndUpdate(req.user._id, req.body, {
    new: true,
    runValidators: true,
  }).select("-password");

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    user: updatedUser,
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Prevent deleting admin users
  if (user.role === "admin") {
    return next(new ErrorHandler("Cannot delete admin users", 400));
  }

  // Check if user has active orders
  const activeOrders = await Order.countDocuments({
    user: req.params.id,
    status: { $in: ["Processing", "Confirmed", "Shipped", "In Transit"] },
  });

  if (activeOrders > 0) {
    return next(new ErrorHandler("Cannot delete user with active orders", 400));
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

// @desc    Get user wishlist
// @route   GET /api/users/wishlist
// @access  Private
export const getWishlist = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate({
    path: "wishlist",
    select: "name price images rating category age sizes",
  });

  res.status(200).json({
    success: true,
    count: user.wishlist.length,
    wishlist: user.wishlist,
  });
});

// @desc    Add to wishlist
// @route   POST /api/users/wishlist
// @access  Private
export const addToWishlist = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.body;

  if (!productId) {
    return next(new ErrorHandler("Product ID is required", 400));
  }

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  const user = await User.findById(req.user.id);

  // Check if already in wishlist
  if (user.wishlist.includes(productId)) {
    return next(new ErrorHandler("Product already in wishlist", 400));
  }

  user.wishlist.push(productId);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Product added to wishlist",
    wishlist: user.wishlist,
  });
});

// @desc    Remove from wishlist
// @route   DELETE /api/users/wishlist/:productId
// @access  Private
export const removeFromWishlist = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;

  const user = await User.findById(req.user.id);

  // Check if product is in wishlist
  if (!user.wishlist.includes(productId)) {
    return next(new ErrorHandler("Product not in wishlist", 400));
  }

  user.wishlist = user.wishlist.filter((item) => item.toString() !== productId);

  await user.save();

  res.status(200).json({
    success: true,
    message: "Product removed from wishlist",
    wishlist: user.wishlist,
  });
});

// @desc    Clear wishlist
// @route   DELETE /api/users/wishlist
// @access  Private
export const clearWishlist = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  user.wishlist = [];
  await user.save();

  res.status(200).json({
    success: true,
    message: "Wishlist cleared successfully",
  });
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private/Admin
export const getUserStatistics = catchAsyncErrors(async (req, res, next) => {
  const totalUsers = await User.countDocuments();
  const verifiedUsers = await User.countDocuments({ isVerified: true });
  const adminUsers = await User.countDocuments({ role: "admin" });

  // Users registered in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newUsers = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
  });

  res.status(200).json({
    success: true,
    statistics: {
      totalUsers,
      verifiedUsers,
      adminUsers,
      newUsersLast30Days: newUsers,
      unverifiedUsers: totalUsers - verifiedUsers,
    },
  });
});

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private/Admin
export const updateUserRole = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.body;

  if (!role || !["user", "admin"].includes(role)) {
    return next(
      new ErrorHandler("Please provide a valid role (user or admin)", 400)
    );
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User role updated to ${role}`,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// @desc    Verify user email
// @route   PUT /api/users/:id/verify
// @access  Private/Admin
export const verifyUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  user.isVerified = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: "User verified successfully",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
    },
  });
});

// @desc    Get user orders
// @route   GET /api/users/:id/orders
// @access  Private/Admin
export const getUserOrders = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const orders = await Order.find({ user: req.params.id })
    .populate("orderItems.product", "name image")
    .sort({ createdAt: -1 });

  const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0);

  res.status(200).json({
    success: true,
    count: orders.length,
    totalSpent,
    orders,
  });
});
