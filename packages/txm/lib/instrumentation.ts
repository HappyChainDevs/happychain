import opentelemetry from '@opentelemetry/api';
import {
  ConsoleMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';


const resource = Resource.default().merge(
  new Resource({
    [ATTR_SERVICE_NAME]: 'txm',
    [ATTR_SERVICE_VERSION]: '0.1.0',
  }),
);

const prometheusExporter = new PrometheusExporter({ port: 9090 });

const myServiceMeterProvider = new MeterProvider({
  resource: resource,
  readers: [prometheusExporter],
});

opentelemetry.metrics.setGlobalMeterProvider(myServiceMeterProvider);
