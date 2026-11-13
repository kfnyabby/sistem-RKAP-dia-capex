// Centralized error handler middleware
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Terjadi kesalahan pada server',
    ...(err.errors && { errors: err.errors }),
  });
};

module.exports = errorHandler;

