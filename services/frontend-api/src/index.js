require('../shared/tracing');

const express = require('express');
const fetch = require('node-fetch');
const { trace, context, propagation } = require('@opentelemetry/api');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:8081';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:8082';

async function fetchWithTracing(url, options = {}) {
  const headers = {};
  propagation.inject(context.active(), headers);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...headers
    },
    timeout: 10000
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

app.get('/api/checkout/:userId', async (req, res) => {
  const tracer = trace.getTracer('frontend-api');
  const span = tracer.startSpan('checkout');
  
  const { userId } = req.params;
  const productId = req.query.productId || '1';
  
  span.setAttribute('user.id', userId);
  span.setAttribute('product.id', productId);
  span.setAttribute('operation', 'checkout');
  
  let productData = null;
  let paymentData = null;
  let productError = null;
  let paymentError = null;
  
  try {
    // Fetch product details
    const productSpan = tracer.startSpan('fetch-product');
    try {
      productData = await fetchWithTracing(`${PRODUCT_SERVICE_URL}/api/products/${productId}`);
      productSpan.setAttribute('product.fetch.success', true);
      productSpan.setAttribute('product.name', productData.product?.name);
    } catch (err) {
      productError = err;
      productSpan.recordException(err);
      productSpan.setAttribute('product.fetch.success', false);
      console.error('Product fetch failed:', err.message);
    } finally {
      productSpan.end();
    }
    
    // Process payment
    const paymentSpan = tracer.startSpan('process-payment');
    try {
      paymentData = await fetchWithTracing(`${PAYMENT_SERVICE_URL}/api/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          productId,
          amount: productData?.product?.price || 99.99
        })
      });
      paymentSpan.setAttribute('payment.success', true);
      paymentSpan.setAttribute('payment.id', paymentData.paymentId);
    } catch (err) {
      paymentError = err;
      paymentSpan.recordException(err);
      paymentSpan.setAttribute('payment.success', false);
      console.error('Payment processing failed:', err.message);
    } finally {
      paymentSpan.end();
    }
    
    // Determine response based on errors
    if (productError || paymentError) {
      span.setAttribute('checkout.partial_failure', true);
      span.setAttribute('checkout.success', false);
      
      const errors = [];
      if (productError) errors.push('product_unavailable');
      if (paymentError) errors.push('payment_failed');
      
      span.setAttribute('errors', errors.join(','));
      
      res.status(503).json({
        success: false,
        error: 'Checkout failed',
        details: {
          product: productError ? productError.message : 'ok',
          payment: paymentError ? paymentError.message : 'ok'
        }
      });
    } else {
      span.setAttribute('checkout.success', true);
      
      res.json({
        success: true,
        message: 'Checkout completed successfully',
        product: productData.product,
        payment: paymentData
      });
    }
    
  } catch (err) {
    span.recordException(err);
    span.setAttribute('error', true);
    span.setAttribute('checkout.error', true);
    
    console.error('Checkout error:', err);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: err.message
    });
  } finally {
    span.end();
  }
});

app.get('/api/products', async (req, res) => {
  const tracer = trace.getTracer('frontend-api');
  const span = tracer.startSpan('listProducts');
  
  try {
    const data = await fetchWithTracing(`${PRODUCT_SERVICE_URL}/api/products`);
    span.setAttribute('products.count', data.products?.length || 0);
    res.json(data);
  } catch (err) {
    span.recordException(err);
    span.setAttribute('error', true);
    console.error('Products list failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  } finally {
    span.end();
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'frontend-api',
    version: '1.0.0'
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Frontend API',
    version: '1.0.0',
    endpoints: {
      checkout: '/api/checkout/:userId?productId=1',
      products: '/api/products',
      health: '/health'
    }
  });
});

const server = app.listen(PORT, () => {
  console.log(`Frontend API listening on port ${PORT}`);
  console.log(`Product Service: ${PRODUCT_SERVICE_URL}`);
  console.log(`Payment Service: ${PAYMENT_SERVICE_URL}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
