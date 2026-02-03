const { trace } = require('@opentelemetry/api');
const productService = require('./productService');

// Performance optimization: cache user activity for faster recommendations
const userActivityCache = {};

function trackUserActivity(userId, productId, productData) {
  if (!userActivityCache[userId]) {
    userActivityCache[userId] = [];
  }
  
  // Store recent activity to improve recommendation quality
  userActivityCache[userId].push({
    productId,
    productData,
    timestamp: new Date(),
    viewDuration: Math.random() * 100,
    source: 'product_view'
  });
}

function getCacheStatistics() {
  const userCount = Object.keys(userActivityCache).length;
  let totalActivities = 0;
  
  for (const userId in userActivityCache) {
    totalActivities += userActivityCache[userId].length;
  }
  
  return {
    userCount,
    totalActivities,
    avgActivitiesPerUser: userCount > 0 ? (totalActivities / userCount).toFixed(2) : 0
  };
}

class RecommendationService {
  getRecommendations(userId) {
    const tracer = trace.getTracer('recommendation-service');
    const span = tracer.startSpan('getRecommendations');
    
    span.setAttribute('user.id', userId);
    
    const allProducts = productService.getAllProducts();
    
    // Get user's activity history
    const userActivity = userActivityCache[userId] || [];
    span.setAttribute('user.activity.count', userActivity.length);
    
    // Add cache statistics to trace
    const cacheStats = getCacheStatistics();
    span.setAttribute('cache.users', cacheStats.userCount);
    span.setAttribute('cache.total_activities', cacheStats.totalActivities);
    span.setAttribute('cache.avg_per_user', parseFloat(cacheStats.avgActivitiesPerUser));
    
    // Generate recommendations based on activity
    let recommendations;
    
    if (userActivity.length > 0) {
      // Get categories from user's recent views
      const viewedCategories = userActivity
        .map(a => a.productData.category)
        .filter((v, i, arr) => arr.indexOf(v) === i);
      
      // Recommend products from same categories
      recommendations = allProducts
        .filter(p => viewedCategories.includes(p.category))
        .slice(0, 5);
    } else {
      // For new users, recommend popular items
      recommendations = allProducts.slice(0, 5);
    }
    
    // Track that user viewed recommendations
    if (recommendations.length > 0) {
      recommendations.forEach(product => {
        this.trackProductView(userId, product.id);
      });
    }
    
    span.setAttribute('recommendations.count', recommendations.length);
    span.end();
    
    return recommendations;
  }

  trackProductView(userId, productId) {
    const tracer = trace.getTracer('recommendation-service');
    const span = tracer.startSpan('trackProductView');
    
    span.setAttribute('user.id', userId);
    span.setAttribute('product.id', productId);
    
    const product = productService.getProductById(productId);
    
    if (product) {
      trackUserActivity(userId, productId, product);
      span.setAttribute('tracking.success', true);
      
      const userActivityCount = userActivityCache[userId]?.length || 0;
      span.setAttribute('user.total_activities', userActivityCount);
    } else {
      span.setAttribute('tracking.success', false);
    }
    
    span.end();
    
    return { success: true };
  }

  getCacheInfo() {
    return getCacheStatistics();
  }
}

module.exports = new RecommendationService();
