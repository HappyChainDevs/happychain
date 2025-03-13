import opentelemetry from "@opentelemetry/api"
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto"
import { Resource } from "@opentelemetry/resources"
import { MeterProvider, type MetricReader } from "@opentelemetry/sdk-metrics"
import {
    BatchSpanProcessor,
    ConsoleSpanExporter,
    NodeTracerProvider,
    SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-node"
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions"

const resource = Resource.default().merge(
    new Resource({
        [ATTR_SERVICE_NAME]: "txm",
        [ATTR_SERVICE_VERSION]: "0.1.0",
    }),
)

export function initializeTelemetry({
    active,
    port,
    metricReaders,
}: { active: boolean; port: number; metricReaders?: MetricReader[] }): void {
    if (!active) {
        return
    }

    const meterProvider = new MeterProvider({
        resource: resource,
        readers: metricReaders || [new PrometheusExporter({ port })],
    })

    opentelemetry.metrics.setGlobalMeterProvider(meterProvider)
}

const tracerProvider = new NodeTracerProvider({
    resource,
    spanProcessors: [
        new BatchSpanProcessor(
            new OTLPTraceExporter({
                url: "http://localhost:4318/v1/traces",
            }),
        ),
        new SimpleSpanProcessor(new ConsoleSpanExporter()),
    ],
})

tracerProvider.register()
