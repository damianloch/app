const { trace, context } = require('@opentelemetry/api');

function requestLogger(req, res, next) {
  const tracer = trace.getTracer('http-middleware');
  const span = tracer.startSpan('request-logger');
  
  const startTime = Date.now();
  
  span.setAttribute('http.method', req.method);
  span.setAttribute('http.url', req.url);
  span.setAttribute('http.route', req.route?.path || req.url);
  
  if (req.params.userId) {
    span.setAttribute('user.id', req.params.userId);
  }
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    span.setAttribute('http.status_code', res.statusCode);
    span.setAttribute('http.response_time_ms', duration);
    span.end();
    
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
}

module.exports = {
  requestLogger
};
