import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide category name"],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: String,
    image: String,
    color: {
      type: String,
      default: "bg-orange-500",
    },
    icon: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    productCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;
