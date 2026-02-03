require('./tracing');

const express = require('express');
const healthRoutes = require('./routes/health');
const productRoutes = require('./routes/products');
const recommendationRoutes = require('./routes/recommendations');
const { requestLogger } = require('./middleware/logging');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/recommendations', recommendationRoutes);

app.get('/', (req, res) => {
  res.json({
    service: 'Product Recommendations API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      products: '/api/products',
      productById: '/api/products/:id',
      search: '/api/products/search',
      recommendations: '/api/recommendations/:userId',
      trackView: '/api/recommendations/track/:userId/:productId'
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

const server = app.listen(PORT, () => {
  console.log(`Product Recommendations API listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`GCP Project: ${process.env.GCP_PROJECT_ID || 'not set'}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
