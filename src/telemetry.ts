import process from 'node:process';

import {
  environment,
  isProduction,
  isTest,
  product,
  service,
  version,
} from './env';

import {
  api,
  logs,
  metrics,
  NodeSDK,
  resources,
  tracing,
} from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAMESPACE,
} from '@opentelemetry/semantic-conventions/incubating';

const { BatchSpanProcessor, SimpleSpanProcessor } = tracing;

const { PeriodicExportingMetricReader } = metrics;

const {
  BatchLogRecordProcessor,
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
} = logs;

const sdk = new NodeSDK({
  autoDetectResources: false,
  resource: new resources.Resource({
    [ATTR_SERVICE_NAMESPACE]: product,
    [ATTR_SERVICE_NAME]: service,
    [ATTR_SERVICE_VERSION]: version,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environment,
  }),
  spanProcessors: !isTest
    ? [
        isProduction
          ? new BatchSpanProcessor(new OTLPTraceExporter())
          : new SimpleSpanProcessor(new OTLPTraceExporter()),
      ]
    : [],
  instrumentations: [
    new HttpInstrumentation(),
    new FastifyInstrumentation(),
    new PinoInstrumentation(),
  ],
  logRecordProcessor: !isTest
    ? isProduction
      ? new BatchLogRecordProcessor(new ConsoleLogRecordExporter())
      : new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())
    : undefined,
  metricReader: !isTest
    ? new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
      })
    : undefined,
});

sdk.start();

export const tracer = api.trace.getTracer('default');

export const meter = api.metrics.getMeter('default');

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(
      () => console.log('Telemetry shut down successfully'),
      () => console.log('Telemetry shut down failed'),
    )
    .finally(() => process.exit(0));
});
