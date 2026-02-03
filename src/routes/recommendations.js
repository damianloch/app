const express = require('express');
const router = express.Router();
const recommendationService = require('../services/recommendationService');

router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    const recommendations = recommendationService.getRecommendations(userId);
    
    // Track that user viewed recommendations page
    if (recommendations.length > 0) {
      recommendationService.trackProductView(userId, recommendations[0].id);
    }
    
    res.json({
      success: true,
      userId,
      count: recommendations.length,
      recommendations
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations'
    });
  }
});

router.post('/track/:userId/:productId', (req, res) => {
  try {
    const { userId, productId } = req.params;
    
    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and Product ID are required'
      });
    }
    
    const result = recommendationService.trackProductView(userId, productId);
    
    res.json({
      success: true,
      message: 'Product view tracked successfully',
      userId,
      productId
    });
  } catch (error) {
    console.error('Error tracking product view:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track product view'
    });
  }
});

router.get('/debug/cache-info', (req, res) => {
  try {
    const cacheInfo = recommendationService.getCacheInfo();
    
    res.json({
      success: true,
      cache: cacheInfo
    });
  } catch (error) {
    console.error('Error getting cache info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache info'
    });
  }
});

module.exports = router;
