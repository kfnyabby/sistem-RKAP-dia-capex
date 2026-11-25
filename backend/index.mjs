import 'dotenv/config';
import app from './src/app.js';

const PORT = process.env.PORT || 5000;

// Jalankan listener port hanya pada server lokal (bukan di Vercel Serverless / Cloud)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  if (process.argv[1] && process.argv[1].endsWith('index.mjs')) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  }
}

export const handler = (req, res) => app(req, res);
export default app;
