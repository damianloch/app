const { trace } = require('@opentelemetry/api');

const products = [
  { id: 1, name: 'Wireless Headphones', category: 'Electronics', price: 79.99, description: 'High-quality wireless headphones with noise cancellation', inStock: true },
  { id: 2, name: 'Smart Watch', category: 'Electronics', price: 199.99, description: 'Fitness tracking smartwatch with heart rate monitor', inStock: true },
  { id: 3, name: 'Laptop Stand', category: 'Office', price: 34.99, description: 'Ergonomic aluminum laptop stand', inStock: true },
  { id: 4, name: 'Mechanical Keyboard', category: 'Electronics', price: 129.99, description: 'RGB mechanical gaming keyboard', inStock: true },
  { id: 5, name: 'USB-C Hub', category: 'Electronics', price: 49.99, description: '7-in-1 USB-C multiport adapter', inStock: true },
  { id: 6, name: 'Desk Lamp', category: 'Office', price: 39.99, description: 'LED desk lamp with adjustable brightness', inStock: true },
  { id: 7, name: 'Wireless Mouse', category: 'Electronics', price: 29.99, description: 'Ergonomic wireless mouse with precision tracking', inStock: true },
  { id: 8, name: 'Webcam', category: 'Electronics', price: 89.99, description: '1080p HD webcam with built-in microphone', inStock: true },
  { id: 9, name: 'Phone Stand', category: 'Accessories', price: 14.99, description: 'Adjustable phone holder for desk', inStock: true },
  { id: 10, name: 'Cable Organizer', category: 'Accessories', price: 12.99, description: 'Cable management system for desk', inStock: true },
  { id: 11, name: 'Monitor Arm', category: 'Office', price: 149.99, description: 'Single monitor mount with full articulation', inStock: true },
  { id: 12, name: 'Bluetooth Speaker', category: 'Electronics', price: 59.99, description: 'Portable waterproof Bluetooth speaker', inStock: true },
  { id: 13, name: 'Noise Machine', category: 'Home', price: 44.99, description: 'White noise machine for better sleep', inStock: true },
  { id: 14, name: 'Backpack', category: 'Accessories', price: 69.99, description: 'Laptop backpack with USB charging port', inStock: true },
  { id: 15, name: 'Water Bottle', category: 'Home', price: 24.99, description: 'Insulated stainless steel water bottle', inStock: true },
  { id: 16, name: 'Yoga Mat', category: 'Fitness', price: 34.99, description: 'Non-slip exercise yoga mat', inStock: true },
  { id: 17, name: 'Resistance Bands', category: 'Fitness', price: 19.99, description: 'Set of 5 resistance exercise bands', inStock: true },
  { id: 18, name: 'Foam Roller', category: 'Fitness', price: 29.99, description: 'High-density muscle massage roller', inStock: true },
  { id: 19, name: 'Coffee Maker', category: 'Home', price: 89.99, description: 'Programmable drip coffee maker', inStock: true },
  { id: 20, name: 'Blender', category: 'Home', price: 79.99, description: 'High-speed smoothie blender', inStock: true },
  { id: 21, name: 'Air Purifier', category: 'Home', price: 149.99, description: 'HEPA air purifier for large rooms', inStock: true },
  { id: 22, name: 'Standing Desk', category: 'Office', price: 399.99, description: 'Electric height-adjustable standing desk', inStock: true },
  { id: 23, name: 'Office Chair', category: 'Office', price: 299.99, description: 'Ergonomic mesh office chair', inStock: true },
  { id: 24, name: 'Desk Pad', category: 'Office', price: 19.99, description: 'Large leather desk mat', inStock: true },
  { id: 25, name: 'Tablet', category: 'Electronics', price: 329.99, description: '10-inch tablet with stylus support', inStock: true },
  { id: 26, name: 'E-Reader', category: 'Electronics', price: 139.99, description: 'Waterproof e-ink reading device', inStock: true },
  { id: 27, name: 'Fitness Tracker', category: 'Fitness', price: 79.99, description: 'Activity and sleep tracking band', inStock: true },
  { id: 28, name: 'Jump Rope', category: 'Fitness', price: 14.99, description: 'Speed jump rope with counter', inStock: true },
  { id: 29, name: 'Dumbbells', category: 'Fitness', price: 49.99, description: 'Adjustable weight dumbbells', inStock: true },
  { id: 30, name: 'Notebook Set', category: 'Office', price: 16.99, description: 'Set of 3 ruled notebooks', inStock: true },
];

class ProductService {
  getAllProducts() {
    const tracer = trace.getTracer('product-service');
    const span = tracer.startSpan('getAllProducts');
    
    span.setAttribute('product.count', products.length);
    
    const result = [...products];
    
    span.end();
    return result;
  }

  getProductById(id) {
    const tracer = trace.getTracer('product-service');
    const span = tracer.startSpan('getProductById');
    
    span.setAttribute('product.id', id);
    
    const product = products.find(p => p.id === parseInt(id));
    
    if (product) {
      span.setAttribute('product.found', true);
      span.setAttribute('product.name', product.name);
    } else {
      span.setAttribute('product.found', false);
    }
    
    span.end();
    return product;
  }

  searchProducts(query) {
    const tracer = trace.getTracer('product-service');
    const span = tracer.startSpan('searchProducts');
    
    span.setAttribute('search.query', query);
    
    const lowerQuery = query.toLowerCase();
    const results = products.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      p.description.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery)
    );
    
    span.setAttribute('search.results.count', results.length);
    
    span.end();
    return results;
  }

  getProductsByCategory(category) {
    const tracer = trace.getTracer('product-service');
    const span = tracer.startSpan('getProductsByCategory');
    
    span.setAttribute('category', category);
    
    const results = products.filter(p => 
      p.category.toLowerCase() === category.toLowerCase()
    );
    
    span.setAttribute('results.count', results.length);
    
    span.end();
    return results;
  }
}

module.exports = new ProductService();
