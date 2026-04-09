function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || res.statusCode || 500;

  res.status(statusCode >= 400 ? statusCode : 500).json({
    message: error.message || "Internal server error.",
  });
}

module.exports = { notFound, errorHandler };
