import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { DbConnect } from "./database/dbconnect.js";
import { errorMiddleware } from "./middlewares/ErrorMiddleWare.js";

// Import routes
import authRoutes from "./routes/Auth.js";
import productRoutes from "./routes/Product.js";
import orderRoutes from "./routes/Order.js";
import userRoutes from "./routes/User.js";
import categoryRoutes from "./routes/Category.js";
import cartRoutes from "./routes/Cart.js";
dotenv.config();
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://dressgallery.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);

// Health check route
app.get("/", (req, res) => {
  res.json({
    message: "Dress Gallery API is running!",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      products: "/api/products",
      orders: "/api/orders",
      users: "/api/users",
      categories: "/api/categories",
    },
  });
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running at port-${process.env.PORT}`);
});

DbConnect();

app.use(errorMiddleware);
