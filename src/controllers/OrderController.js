import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { catchAsyncErrors } from "../middlewares/CatchAsyncErrors.js";
import ErrorHandler from "../middlewares/ErrorMiddleWare.js";

// @desc    Create new order
export const createOrder = catchAsyncErrors(async (req, res, next) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    return next(new ErrorHandler("No order items", 400));
  }

  const order = await Order.create({
    user: req.user.id,
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  });

  // Update product stock
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (product) {
      product.stock -= item.quantity;
      await product.save();
    }
  }

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    order,
  });
});

// @desc    Get logged in user orders
export const getMyOrders = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find({ user: req.user.id })
    .populate("orderItems.product", "name image")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    orders,
  });
});

// @desc    Get order by ID
export const getOrderById = catchAsyncErrors(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("orderItems.product", "name image");

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  // Make sure user is order owner or admin
  if (order.user._id.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorized to view this order", 401));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// @desc    Update order to paid
export const updateOrderToPaid = catchAsyncErrors(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    id: req.body.id,
    status: req.body.status,
    updateTime: req.body.update_time,
    emailAddress: req.body.payer.email_address,
  };

  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    message: "Order updated to paid",
    order: updatedOrder,
  });
});

// @desc    Update order status
export const updateOrderStatus = catchAsyncErrors(async (req, res, next) => {
  const { status, trackingNumber } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  order.status = status || order.status;

  if (trackingNumber) {
    order.trackingNumber = trackingNumber;
  }

  if (status === "Delivered") {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
  }

  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    message: "Order status updated successfully",
    order: updatedOrder,
  });
});

// @desc    Get all orders (Admin)
export const getAllOrders = catchAsyncErrors(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find({})
    .populate("user", "name email")
    .populate("orderItems.product", "name")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Order.countDocuments();

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    orders,
  });
});

// @desc    Cancel order
export const cancelOrder = catchAsyncErrors(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  // Check if user owns the order
  if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorized to cancel this order", 401));
  }

  // Can't cancel if already shipped
  if (order.status === "Shipped" || order.status === "Delivered") {
    return next(
      new ErrorHandler(
        "Cannot cancel order that has been shipped or delivered",
        400
      )
    );
  }

  order.status = "Cancelled";
  await order.save();

  // Restore product stock
  for (const item of order.orderItems) {
    const product = await Product.findById(item.product);
    if (product) {
      product.stock += item.quantity;
      await product.save();
    }
  }

  res.status(200).json({
    success: true,
    message: "Order cancelled successfully",
    order,
  });
});
