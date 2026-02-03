const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'product-recommendations-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
