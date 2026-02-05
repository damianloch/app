const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { TraceExporter } = require('@google-cloud/opentelemetry-cloud-trace-exporter');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { BatchSpanProcessor, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const serviceName = process.env.OTEL_SERVICE_NAME || 'product-recommendations-api';

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

const exporters = [];

// Google Cloud Trace exporter
if (process.env.GCP_PROJECT_ID) {
  const gcpExporter = new TraceExporter({
    projectId: process.env.GCP_PROJECT_ID,
  });
  exporters.push(gcpExporter);
  console.log('Google Cloud Trace exporter configured');
}

// OpenTelemetry Collector exporter
if (process.env.SPLUNK_HEC_ENDPOINT && process.env.SPLUNK_HEC_TOKEN) {
  const baseExporter = new OTLPTraceExporter({
    url: `${process.env.SPLUNK_HEC_ENDPOINT}/v1/traces`,
  });
  
  // Wrap exporter to add logging
  const originalExport = baseExporter.export.bind(baseExporter);
  baseExporter.export = (spans, resultCallback) => {
    console.log(`[OTLP] Exporting ${spans.length} spans to ${process.env.SPLUNK_HEC_ENDPOINT}/v1/traces`);
    originalExport(spans, (result) => {
      if (result.code !== 0) {
        console.error(`[OTLP] Export failed:`, result);
      } else {
        console.log(`[OTLP] Export succeeded`);
      }
      resultCallback(result);
    });
  };
  
  exporters.push(baseExporter);
  console.log(`OpenTelemetry Collector exporter configured: ${process.env.SPLUNK_HEC_ENDPOINT}`);
}

if (exporters.length === 0) {
  console.error('No trace exporters configured. Set GCP_PROJECT_ID and/or SPLUNK_HEC_ENDPOINT+SPLUNK_HEC_TOKEN');
  process.exit(1);
}

// Use SimpleSpanProcessor for OTLP (immediate export) and BatchSpanProcessor for GCP
const spanProcessors = [];
if (process.env.GCP_PROJECT_ID) {
  spanProcessors.push(new BatchSpanProcessor(exporters[0])); // GCP is first
}
if (process.env.SPLUNK_HEC_ENDPOINT) {
  const otlpExporter = process.env.GCP_PROJECT_ID ? exporters[1] : exporters[0];
  spanProcessors.push(new SimpleSpanProcessor(otlpExporter)); // OTLP exports immediately
  console.log('[OTLP] Using SimpleSpanProcessor for immediate export');
}

const sdk = new NodeSDK({
  resource: resource,
  spanProcessors: spanProcessors,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

sdk.start();
console.log(`OpenTelemetry tracing initialized for ${serviceName} with ${exporters.length} exporter(s)`);

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.error('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

module.exports = sdk;
