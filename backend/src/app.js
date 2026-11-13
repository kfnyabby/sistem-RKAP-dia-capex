const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'API RKAP Server is running' });
});

// API Routes
app.use('/api', routes);

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;

