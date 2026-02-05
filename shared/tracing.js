const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { trace } = require('@opentelemetry/api');

const serviceName = process.env.OTEL_SERVICE_NAME || 'unknown-service';

// Create provider with resource
const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  }),
});

// Add OTLP exporter pointing to collector
const collectorUrl = process.env.SPLUNK_HEC_ENDPOINT || 'http://otel-collector:4318';
const exporter = new OTLPTraceExporter({
  url: `${collectorUrl}/v1/traces`,
});

provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

// Register as global provider
provider.register();

// Register auto-instrumentations
registerInstrumentations({
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

console.log(`Tracing initialized for ${serviceName} -> ${collectorUrl}`);

module.exports = provider;
