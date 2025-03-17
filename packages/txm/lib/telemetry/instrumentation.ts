import opentelemetry from "@opentelemetry/api"
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus"
import { Resource } from "@opentelemetry/resources"
import { MeterProvider, type MetricReader } from "@opentelemetry/sdk-metrics"
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
