const express = require('express');
const { Pool } = require('pg');
const { trace, context } = require('@opentelemetry/api');
require('../../../shared/tracing');

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres-service',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ecommerce',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const tracer = trace.getTracer('payment-service');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'payment-service' });
});

// Get all payments
app.get('/api/payments', async (req, res) => {
  const span = tracer.startSpan('get_payments');
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT * FROM payments ORDER BY created_at DESC LIMIT 100');
    span.setAttribute('payments.count', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    span.recordException(error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
    span.end();
  }
});

// Process payment
app.post('/api/payments/process', async (req, res) => {
  const span = tracer.startSpan('process_payment');
  const { orderId, amount, currency = 'USD', customerId } = req.body;
  
  const client = await pool.connect();
  
  try {
    span.setAttribute('payment.order_id', orderId);
    span.setAttribute('payment.amount', amount);
    span.setAttribute('payment.currency', currency);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    const result = await client.query(
      'INSERT INTO payments (order_id, amount, currency, customer_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [orderId, amount, currency, customerId, 'completed']
    );
    
    span.setAttribute('payment.id', result.rows[0].id);
    span.setAttribute('payment.status', 'success');
    
    // Always release the connection back to the pool after a successful payment
    client.release();
    span.addEvent('connection_released');
    
    res.json({ 
      success: true, 
      payment: result.rows[0],
      message: 'Payment processed successfully'
    });
  } catch (error) {
    span.recordException(error);
    client.release();
    res.status(500).json({ error: error.message });
  } finally {
    span.end();
  }
});

// Get payment by ID
app.get('/api/payments/:id', async (req, res) => {
  const span = tracer.startSpan('get_payment');
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }
    
    span.setAttribute('payment.id', req.params.id);
    res.json(result.rows[0]);
  } catch (error) {
    span.recordException(error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
    span.end();
  }
});

const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});

module.exports = app;
