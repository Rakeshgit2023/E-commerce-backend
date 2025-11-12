import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide product name"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please provide product description"],
    },
    price: {
      type: Number,
      required: [true, "Please provide product price"],
      min: 0,
    },
    originalPrice: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    category: {
      type: String,
      required: [true, "Please provide category"],
      enum: [
        "Boys Fashion",
        "Girls Fashion",
        "Party Wear",
        "School Wear",
        "Casual",
      ],
    },
    age: {
      type: String,
      required: [true, "Please provide age range"],
      enum: ["3-5 years", "5-8 years", "8-12 years", "0-3 years"],
    },
    sizes: [
      {
        type: String,
        enum: ["S", "M", "L", "XL", "XXL"],
      },
    ],
    colors: [
      {
        type: String,
      },
    ],
    images: [
      {
        type: String,
        required: true,
      },
    ],
    stock: {
      type: Number,
      required: [true, "Please provide stock quantity"],
      min: 0,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        name: String,
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    material: String,
    brand: String,
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// Create index for search
productSchema.index({ name: "text", description: "text", tags: "text" });

// --- Product count auto-update logic below ---
productSchema.post("save", async function (doc) {
  const Product = mongoose.model("Product");
  const Category = mongoose.model("Category");
  if (!doc.category) return;
  const count = await Product.countDocuments({ category: doc.category });
  await Category.findOneAndUpdate(
    { name: doc.category },
    { productCount: count }
  );
});

productSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;
  const Product = mongoose.model("Product");
  const Category = mongoose.model("Category");
  if (!doc.category) return;
  const count = await Product.countDocuments({ category: doc.category });
  await Category.findOneAndUpdate(
    { name: doc.category },
    { productCount: count }
  );
});

const Product = mongoose.model("Product", productSchema);
export default Product;
