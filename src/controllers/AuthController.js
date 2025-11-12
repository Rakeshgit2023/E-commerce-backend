import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import { catchAsyncErrors } from "../middlewares/CatchAsyncErrors.js";
import ErrorHandler from "../middlewares/ErrorMiddleWare.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "../utils/uploadToCloudinary.js";
import Order from "../models/Order.js";
import mongoose from "mongoose";

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = catchAsyncErrors(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(errors.array()[0].msg, 400));
  }

  const { name, email, password, phone, role } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new ErrorHandler("User already exists with this email", 400));
  }

  let avatarUrl = "default-avatar.png";

  // Handle avatar upload if file is present
  if (req.file) {
    const uploadResult = await uploadToCloudinary(
      req.file,
      "dress-gallery/avatars"
    );
    avatarUrl = uploadResult.secure_url;
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    phone,
    role,
    avatar: avatarUrl,
  });

  // Generate token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = catchAsyncErrors(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(errors.array()[0].msg, 400));
  }

  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid credentials", 401));
  }

  // Check if password matches
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid credentials", 401));
  }

  // Generate token
  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
// export const getMe = catchAsyncErrors(async (req, res, next) => {
//   const user = await User.findById(req.user.id).populate("wishlist");

//   res.status(200).json({
//     success: true,
//     user,
//   });
// });

export const getMe = catchAsyncErrors(async (req, res, next) => {
  // Get user with wishlist populated
  const user = await User.findById(req.user.id).populate("wishlist");

  // Get total number of orders
  const totalOrders = await Order.countDocuments({ user: req.user.id });

  const orderStats = await Order.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(req.user.id),
        status: { $in: ["Confirmed", "In Transit", "Shipped", "Delivered"] },
      },
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: "$totalPrice" },
      },
    },
  ]);

  const totalSpent = orderStats.length > 0 ? orderStats[0].totalSpent : 0;

  // Get wishlist count
  const wishlistCount = user.wishlist ? user.wishlist.length : 0;

  res.status(200).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      wishlist: user.wishlist,
    },
    stats: {
      totalOrders,
      totalSpent,
      wishlistCount,
    },
  });
});
// @desc    Update user profile with avatar
// @route   PUT /api/auth/update-profile
// @access  Private
export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
  };

  // Handle avatar upload if file is present
  if (req.file) {
    const user = await User.findById(req.user.id);

    // Delete old avatar from Cloudinary if exists and is not default
    if (user.avatar && user.avatar !== "default-avatar.png") {
      try {
        const publicId = extractPublicId(user.avatar);
        await deleteFromCloudinary(publicId);
      } catch (error) {
        console.log("Error deleting old avatar:", error.message);
      }
    }

    // Upload new avatar
    const uploadResult = await uploadToCloudinary(
      req.file,
      "dress-gallery/avatars"
    );
    fieldsToUpdate.avatar = uploadResult.secure_url;
  }

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user,
  });
});

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
export const updatePassword = catchAsyncErrors(async (req, res, next) => {
  const { currentPassword, newPassword, email } = req.body;

  if (!currentPassword || !newPassword) {
    return next(
      new ErrorHandler("Please provide current password and new password", 400)
    );
  }

  if (newPassword.length < 6) {
    return next(
      new ErrorHandler("New password must be at least 6 characters", 400)
    );
  }

  const user = await User.findOne({ email: email }).select("+password");

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new ErrorHandler("Current password is incorrect", 401));
  }

  user.password = newPassword;
  await user.save();

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
    token,
  });
});

// @desc    Delete user avatar
// @route   DELETE /api/auth/avatar
// @access  Private
export const deleteAvatar = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user.avatar || user.avatar === "default-avatar.png") {
    return next(new ErrorHandler("No avatar to delete", 400));
  }

  // Delete from Cloudinary
  try {
    const publicId = extractPublicId(user.avatar);
    await deleteFromCloudinary(publicId);
  } catch (error) {
    console.log("Error deleting avatar:", error.message);
  }

  // Set to default
  user.avatar = "default-avatar.png";
  await user.save();

  res.status(200).json({
    success: true,
    message: "Avatar deleted successfully",
    user,
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = catchAsyncErrors(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export const verifyUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({
    email: req.body.email,
  });

  console.log(user);

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "User verified successfully",
    user: {
      id: user._id,
      email: user.email,
    },
  });
});
