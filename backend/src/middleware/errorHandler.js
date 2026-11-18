// Centralized error handler middleware
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Terjadi kesalahan pada server';

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    status = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Ukuran berkas melebihi batas maksimum 15MB';
    } else {
      message = `Galat pengunggahan berkas: ${err.message}`;
    }
  }

  // Handle file filter or corrupted workbook errors
  if (
    err.code === 'INVALID_FILE_TYPE' ||
    message.includes('spreadsheet Excel (.xlsx)') ||
    message.includes('Berkas Excel rusak')
  ) {
    status = 400;
  }

  if (status >= 500) {
    console.error('Unhandled server error:', err);
  }
  res.status(status).json({
    message,
    ...(err.errors && { errors: err.errors }),
  });
};

module.exports = errorHandler;
