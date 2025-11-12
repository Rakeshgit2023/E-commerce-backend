import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

/**
 * Upload single image to Cloudinary
 * @param {Object} file - Multer file object (from req.file)
 * @param {String} folder - Cloudinary folder path
 * @returns {Promise} - Cloudinary upload result
 */
export const uploadToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto",
        transformation: [
          { width: 1000, height: 1000, crop: "limit" },
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const bufferStream = Readable.from(file.buffer);
    bufferStream.pipe(uploadStream);
  });
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array} files - Array of multer file objects (from req.files)
 * @param {String} folder - Cloudinary folder path
 * @returns {Promise<Array>} - Array of Cloudinary upload results
 */
export const uploadMultipleToCloudinary = async (files, folder) => {
  try {
    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file, folder)
    );
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    throw new Error(`Failed to upload images: ${error.message}`);
  }
};

/**
 * Delete single image from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Promise} - Cloudinary delete result
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array} publicIds - Array of Cloudinary public IDs
 * @returns {Promise} - Cloudinary delete result
 */
export const deleteMultipleFromCloudinary = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return result;
  } catch (error) {
    throw new Error(`Failed to delete images: ${error.message}`);
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {String} url - Cloudinary image URL
 * @returns {String} - Public ID with folder path
 *
 * Example:
 * Input: https://res.cloudinary.com/demo/image/upload/v1234567890/dress-gallery/products/abc123.jpg
 * Output: dress-gallery/products/abc123
 */
export const extractPublicId = (url) => {
  try {
    // Split URL by '/'
    const parts = url.split("/");

    // Find the 'upload' index
    const uploadIndex = parts.indexOf("upload");

    if (uploadIndex === -1) {
      throw new Error("Invalid Cloudinary URL");
    }

    // Get everything after 'upload' and version (v1234567890)
    const relevantParts = parts.slice(uploadIndex + 2); // Skip 'upload' and version

    // Join the parts and remove file extension
    const publicIdWithExtension = relevantParts.join("/");
    const publicId = publicIdWithExtension.substring(
      0,
      publicIdWithExtension.lastIndexOf(".")
    );

    return publicId;
  } catch (error) {
    throw new Error(`Failed to extract public ID: ${error.message}`);
  }
};

/**
 * Get image details from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Promise} - Image details
 */
export const getImageDetails = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    throw new Error(`Failed to get image details: ${error.message}`);
  }
};

/**
 * Upload image from URL to Cloudinary
 * @param {String} imageUrl - External image URL
 * @param {String} folder - Cloudinary folder path
 * @returns {Promise} - Cloudinary upload result
 */
export const uploadFromUrl = async (imageUrl, folder) => {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: folder,
      resource_type: "auto",
      transformation: [
        { width: 1000, height: 1000, crop: "limit" },
        { quality: "auto:good" },
      ],
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to upload image from URL: ${error.message}`);
  }
};

/**
 * Generate optimized image URL with transformations
 * @param {String} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {String} - Optimized image URL
 */
export const generateOptimizedUrl = (publicId, options = {}) => {
  const {
    width = 800,
    height = 800,
    crop = "fill",
    quality = "auto",
    format = "auto",
  } = options;

  return cloudinary.url(publicId, {
    transformation: [
      { width, height, crop },
      { quality },
      { fetch_format: format },
    ],
  });
};

/**
 * Create thumbnail from existing image
 * @param {String} publicId - Cloudinary public ID
 * @param {Number} size - Thumbnail size (width and height)
 * @returns {String} - Thumbnail URL
 */
export const createThumbnail = (publicId, size = 200) => {
  return cloudinary.url(publicId, {
    transformation: [
      { width: size, height: size, crop: "thumb", gravity: "face" },
      { quality: "auto" },
    ],
  });
};

/**
 * Rename/move image in Cloudinary
 * @param {String} fromPublicId - Current public ID
 * @param {String} toPublicId - New public ID
 * @returns {Promise} - Cloudinary rename result
 */
export const renameImage = async (fromPublicId, toPublicId) => {
  try {
    const result = await cloudinary.uploader.rename(fromPublicId, toPublicId);
    return result;
  } catch (error) {
    throw new Error(`Failed to rename image: ${error.message}`);
  }
};

/**
 * Get all images in a folder
 * @param {String} folder - Cloudinary folder path
 * @param {Number} maxResults - Maximum number of results
 * @returns {Promise} - List of images
 */
export const getImagesInFolder = async (folder, maxResults = 100) => {
  try {
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: folder,
      max_results: maxResults,
    });
    return result.resources;
  } catch (error) {
    throw new Error(`Failed to get images: ${error.message}`);
  }
};

/**
 * Delete all images in a folder
 * @param {String} folder - Cloudinary folder path
 * @returns {Promise} - Delete result
 */
export const deleteFolder = async (folder) => {
  try {
    // First, get all resources in the folder
    const resources = await getImagesInFolder(folder);

    if (resources.length === 0) {
      return { message: "Folder is already empty" };
    }

    // Extract public IDs
    const publicIds = resources.map((resource) => resource.public_id);

    // Delete all resources
    const result = await deleteMultipleFromCloudinary(publicIds);

    // Delete the folder
    await cloudinary.api.delete_folder(folder);

    return result;
  } catch (error) {
    throw new Error(`Failed to delete folder: ${error.message}`);
  }
};

export default {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  extractPublicId,
  getImageDetails,
  uploadFromUrl,
  generateOptimizedUrl,
  createThumbnail,
  renameImage,
  getImagesInFolder,
  deleteFolder,
};
