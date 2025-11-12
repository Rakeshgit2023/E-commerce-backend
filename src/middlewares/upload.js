import multer from "multer";
import path from "path";
import ErrorHandler from "./ErrorMiddleWare.js";

// Multer memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const filetypes = /jpeg|jpg|png|gif|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      new ErrorHandler(
        "Only image files are allowed (jpeg, jpg, png, gif, webp)",
        400
      ),
      false
    );
  }
};

// Multer upload
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: fileFilter,
});

// Multiple images upload
export const uploadMultiple = upload.array("images", 5); // Max 5 images

// Single image upload
export const uploadSingle = upload.single("image");
