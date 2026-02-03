require('../shared/tracing');

const express = require('express');
const { Pool } = require('pg');
const { trace } = require('@opentelemetry/api');

const app = express();
const PORT = process.env.PORT || 8081;

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

app.get('/api/products', async (req, res) => {
  const tracer = trace.getTracer('product-service');
  const span = tracer.startSpan('getAllProducts');
  
  let client;
  
  try {
    span.addEvent('acquiring_db_connection');
    client = await pool.connect();
    span.addEvent('db_connection_acquired');
    
    span.setAttribute('db.pool.size', pool.totalCount);
    span.setAttribute('db.pool.idle', pool.idleCount);
    span.setAttribute('db.pool.waiting', pool.waitingCount);
    
    const result = await client.query('SELECT * FROM products WHERE in_stock = true ORDER BY id');
    
    client.release();
    span.addEvent('connection_released');
    
    span.setAttribute('products.count', result.rows.length);
    
    res.json({
      success: true,
      count: result.rows.length,
      products: result.rows
    });
    
  } catch (err) {
    span.recordException(err);
    span.setAttribute('error', true);
    span.setAttribute('error.type', err.code || 'unknown');
    
    if (err.code === '57P01' || err.message.includes('timeout')) {
      span.setAttribute('error.type', 'database_timeout');
      console.error('Database connection timeout - pool may be exhausted');
    }
    
    console.error('Error fetching products:', err.message);
    
    if (client) {
      client.release();
    }
    
    res.status(503).json({ 
      success: false, 
      error: 'Service unavailable',
      details: 'Database connection failed'
    });
  } finally {
    span.end();
  }
});

app.get('/api/products/:id', async (req, res) => {
  const tracer = trace.getTracer('product-service');
  const span = tracer.startSpan('getProduct');
  
  const { id } = req.params;
  span.setAttribute('product.id', id);
  
  let client;
  
  try {
    span.addEvent('acquiring_db_connection');
    client = await pool.connect();
    span.addEvent('db_connection_acquired');
    
    span.setAttribute('db.pool.size', pool.totalCount);
    span.setAttribute('db.pool.idle', pool.idleCount);
    span.setAttribute('db.pool.waiting', pool.waitingCount);
    
    const result = await client.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    
    client.release();
    span.addEvent('connection_released');
    
    if (result.rows.length === 0) {
      span.setAttribute('product.found', false);
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found' 
      });
    }
    
    span.setAttribute('product.found', true);
    span.setAttribute('product.name', result.rows[0].name);
    
    res.json({
      success: true,
      product: result.rows[0]
    });
    
  } catch (err) {
    span.recordException(err);
    span.setAttribute('error', true);
    span.setAttribute('error.type', err.code || 'unknown');
    
    if (err.code === '57P01' || err.message.includes('timeout')) {
      span.setAttribute('error.type', 'database_timeout');
      console.error('Database connection timeout - pool may be exhausted');
    }
    
    console.error('Error fetching product:', err.message);
    
    if (client) {
      client.release();
    }
    
    res.status(503).json({ 
      success: false, 
      error: 'Service unavailable',
      details: 'Database connection failed'
    });
  } finally {
    span.end();
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'product-service',
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    }
  });
});

const server = app.listen(PORT, () => {
  console.log(`Product Service listening on port ${PORT}`);
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
