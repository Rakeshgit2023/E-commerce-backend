import express from "express";
import { body } from "express-validator";
import {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  deleteAvatar,
  logout,
  verifyUser,
} from "../controllers/AuthController.js";
import { protect } from "../middlewares/auth.js";
import { uploadSingle } from "../middlewares/upload.js";

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user with optional avatar
// @access  Public
router.post(
  "/register",
  uploadSingle,
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please provide a valid email"),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
      .withMessage(
        "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
  ],
  register
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  "/login",
  [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", protect, getMe);

// @route   PUT /api/auth/update-profile
// @desc    Update user profile with avatar
// @access  Private
router.put("/update-profile", protect, uploadSingle, updateProfile);

// @route   PUT /api/auth/update-password
// @desc    Update password
// @access  Private
router.post("/update-password", updatePassword);

// @route   DELETE /api/auth/avatar
// @desc    Delete user avatar
// @access  Private
router.delete("/avatar", protect, deleteAvatar);

router.post("/isUserExist", verifyUser);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post("/logout", protect, logout);

export default router;
