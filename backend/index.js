require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Jalankan listener port hanya pada server lokal (bukan di cloud/serverless Vercel)
if (require.main === module && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

// Ekspor tunggal Express app untuk runtime Vercel Serverless
module.exports = app;
