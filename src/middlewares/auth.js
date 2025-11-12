import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ErrorHandler from "./ErrorMiddleWare.js";
import { catchAsyncErrors } from "./CatchAsyncErrors.js";

// Protect routes - Verify JWT token
export const protect = catchAsyncErrors(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorHandler("Not authorized to access this route", 401));
  }

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  // Get user from token
  req.user = await User.findById(decoded.id).select("-password");

  if (!req.user) {
    return next(new ErrorHandler("User not found", 401));
  }

  next();
});

// Check if user is admin
export const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return next(new ErrorHandler("Not authorized as admin", 403));
  }
};
