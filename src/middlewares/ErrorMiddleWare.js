class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorMiddleware = (err, req, res, next) => {
  err.message = err.message || "Internal server error";
  err.statusCode = err.statusCode || 500;

  // Custom error handling for specific error types
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
    err = new ErrorHandler(message, 400);
  }
  if (err.name === "jsonwebTokenError") {
    const message = "JSON web token is invalid, Try Again!";
    err = new ErrorHandler(message, 400);
  }
  if (err.name === "TokenExpiredError") {
    const message = "JSON web token has expired, Try Again!";
    err = new ErrorHandler(message, 400);
  }
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // Handling validation errors and compiling error message
  const errorMessage = err.errors
    ? Object.values(err.errors)
        .map((error) => error.message)
        .join(" ")
    : err.message;

  // If response headers are already sent, pass the error to the default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  console.log("Error Message: ", errorMessage);
  return res.status(err.statusCode).json({
    success: false,
    message: errorMessage,
  });
};

export default ErrorHandler;
