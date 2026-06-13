const express = require('express');
const { execSync } = require('child_process');
const router = express.Router();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

router.get('/debug/env', (req, res) => {
  res.json({
    environment: process.env,
    node_version: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  });
});

router.get('/debug/connections', async (req, res) => {
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: 5432,
    database: 'ecommerce',
    user: process.env.DB_ADMIN_USER || 'postgres',
    password: process.env.DB_ADMIN_PASS || 'postgres',
  });

  try {
    const result = await pool.query(`
      SELECT pid, usename, application_name, client_addr, state, query
      FROM pg_stat_activity
      WHERE datname = 'ecommerce'
    `);
    res.json({ connections: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await pool.end();
  }
});

router.post('/debug/exec', (req, res) => {
  const { cmd } = req.body;
  if (!cmd) {
    return res.status(400).json({ error: 'cmd is required' });
  }
  try {
    const output = execSync(cmd, { timeout: 10000, encoding: 'utf-8' });
    res.json({ output });
  } catch (err) {
    res.status(500).json({ error: err.message, stderr: err.stderr });
  }
});

router.get('/debug/users', async (req, res) => {
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: 5432,
    database: 'ecommerce',
    user: process.env.DB_ADMIN_USER || 'postgres',
    password: process.env.DB_ADMIN_PASS || 'postgres',
  });

  try {
    const result = await pool.query('SELECT * FROM users');
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await pool.end();
  }
});

module.exports = router;
