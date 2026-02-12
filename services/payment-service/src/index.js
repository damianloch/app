require('../shared/tracing');

const express = require('express');
const { Pool } = require('pg');
const { trace } = require('@opentelemetry/api');

const app = express();
const PORT = process.env.PORT || 8082;

app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: 5432,
  database: 'ecommerce',
  user: 'appuser',
  password: 'apppass',
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

pool.on('connect', () => {
  console.log('New database connection established');
});

app.post('/api/payments/process', async (req, res) => {
  const tracer = trace.getTracer('payment-service');
  const span = tracer.startSpan('processPayment');
  
  const { userId, productId, amount } = req.body;
  
  span.setAttribute('user.id', userId);
  span.setAttribute('product.id', productId);
  span.setAttribute('payment.amount', amount || 0);
  
  let client;
  
  try {
    span.addEvent('acquiring_db_connection');
    client = await pool.connect();
    span.addEvent('db_connection_acquired');
    
    span.setAttribute('db.pool.size', pool.totalCount);
    span.setAttribute('db.pool.idle', pool.idleCount);
    span.setAttribute('db.pool.waiting', pool.waitingCount);
    
    // Simulate slow payment processing
    await client.query('SELECT pg_sleep(0.5)');
    
    const result = await client.query(
      'INSERT INTO payments (user_id, product_id, amount, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, productId || 1, amount || 99.99, 'completed']
    );
    
    span.setAttribute('payment.id', result.rows[0].id);
    span.setAttribute('payment.status', 'success');
    
    res.json({ 
      success: true, 
      paymentId: result.rows[0].id,
      status: 'completed'
    });
    
  } catch (err) {
    span.recordException(err);
    span.setAttribute('error', true);
    span.setAttribute('error.type', err.code || 'unknown');
    
    console.error('Payment processing error:', err.message);
    
    res.status(500).json({ 
      success: false, 
      error: 'Payment processing failed',
      details: err.message
    });
  } finally {
    // Always release connection back to pool to prevent connection leaks
    if (client) {
      client.release();
      span.addEvent('connection_released');
    }
    span.end();
  }
});

app.get('/api/payments/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy',
      database: 'connected',
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    });
  } catch (err) {
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: err.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'payment-service' });
});

const server = app.listen(PORT, () => {
  console.log(`Payment Service listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    pool.end(() => {
      console.log('Pool has ended');
      process.exit(0);
    });
  });
});
