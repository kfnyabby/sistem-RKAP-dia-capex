// Centralized error handler middleware
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error('Unhandled server error:', err);
  }
  res.status(status).json({
    message: err.message || 'Terjadi kesalahan pada server',
    ...(err.errors && { errors: err.errors }),
  });
};

module.exports = errorHandler;
