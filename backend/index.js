require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

// Request handler wrapper untuk Vercel Serverless
function handler(req, res) {
  return app(req, res);
}

// Hubungkan properti app ke handler
Object.setPrototypeOf(handler, app);

// Ekspor lengkap untuk semua format module loader (CommonJS & ESM default)
module.exports = app;
module.exports.default = app;
module.exports.handler = handler;
module.exports.app = app;
exports = module.exports;
