const { Pool } = require('pg');

class HealthChecker {
  constructor(pool) {
    this.pool = pool;
    this.startTime = Date.now();
  }

  async checkDatabase() {
    try {
      const start = Date.now();
      await this.pool.query('SELECT 1');
      return { status: 'healthy', latency_ms: Date.now() - start };
    } catch (err) {
      return { status: 'unhealthy', error: err.message };
    }
  }

  getPoolStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  getUptime() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  async getFullStatus() {
    const db = await this.checkDatabase();
    const pool = this.getPoolStats();
    const uptime = this.getUptime();

    const healthy = db.status === 'healthy';

    return {
      status: healthy ? 'healthy' : 'degraded',
      uptime_seconds: uptime,
      checks: { database: db },
      pool,
    };
  }
}

module.exports = { HealthChecker };
