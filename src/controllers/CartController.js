import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { catchAsyncErrors } from "../middlewares/CatchAsyncErrors.js";
import ErrorHandler from "../middlewares/ErrorMiddleWare.js";

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
export const getCart = catchAsyncErrors(async (req, res, next) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product",
    "name images price stock originalPrice age discount category"
  );

  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [],
    });
  }

  res.status(200).json({
    success: true,
    data: cart,
  });
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
export const addToCart = catchAsyncErrors(async (req, res, next) => {
  const { productId, quantity = 1, size, color } = req.body;

  // Validate product
  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Check stock availability
  if (product.stock < quantity) {
    return next(new ErrorHandler("Insufficient stock", 400));
  }

  // Find or create cart
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({
      user: req.user._id,
      items: [],
    });
  }

  // Check if item already exists in cart
  const existingItemIndex = cart.items.findIndex(
    (item) =>
      item.product.toString() === productId &&
      item.size === size &&
      item.color === color
  );

  if (existingItemIndex > -1) {
    // Update quantity of existing item
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;

    // Check stock for new quantity
    if (product.stock < newQuantity) {
      return next(
        new ErrorHandler("Insufficient stock for requested quantity", 400)
      );
    }

    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Add new item to cart
    cart.items.push({
      product: productId,
      quantity,
      size,
      color,
      price: product.price,
    });
  }

  await cart.save();
  await cart.populate(
    "items.product",
    "name images price stock originalPrice age discount category"
  );

  res.status(200).json({
    success: true,
    message: "Item added to cart",
    data: cart,
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/:itemId
// @access  Private
export const updateCartItem = catchAsyncErrors(async (req, res, next) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (quantity < 1) {
    return next(new ErrorHandler("Quantity must be at least 1", 400));
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return next(new ErrorHandler("Cart not found", 404));
  }

  const item = cart.items.id(itemId);
  if (!item) {
    return next(new ErrorHandler("Item not found in cart", 404));
  }

  // Check stock availability
  const product = await Product.findById(item.product);
  if (product.stock < quantity) {
    return next(new ErrorHandler("Insufficient stock", 400));
  }

  item.quantity = quantity;
  await cart.save();
  await cart.populate(
    "items.product",
    "name images price stock originalPrice age discount category"
  );

  res.status(200).json({
    success: true,
    message: "Cart item updated",
    data: cart,
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
export const removeFromCart = catchAsyncErrors(async (req, res, next) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return next(new ErrorHandler("Cart not found", 404));
  }

  // Filter out the item to remove (support both cart item ID and product ID)
  const itemsBefore = cart.items.length;
  cart.items = cart.items.filter(
    (item) =>
      item._id.toString() !== itemId && item.product.toString() !== itemId
  );

  // Check if any item was actually removed
  if (cart.items.length === itemsBefore) {
    return next(new ErrorHandler("Item not found in cart", 404));
  }

  await cart.save();
  await cart.populate(
    "items.product",
    "name images price stock originalPrice age discount category"
  );

  res.status(200).json({
    success: true,
    message: "Item removed from cart",
    data: cart,
  });
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = catchAsyncErrors(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return next(new ErrorHandler("Cart not found", 404));
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({
    success: true,
    message: "Cart cleared",
    data: cart,
  });
});
