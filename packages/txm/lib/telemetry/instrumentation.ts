import { PrometheusExporter } from "@opentelemetry/exporter-prometheus"
import { Resource } from "@opentelemetry/resources"
import type { MetricReader } from "@opentelemetry/sdk-metrics"
import { NodeSDK } from "@opentelemetry/sdk-node"
import { ConsoleSpanExporter, type SpanExporter } from "@opentelemetry/sdk-trace-node"
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions"
import { version } from "../../package.json"

export function initializeTelemetry({
    metricsActive,
    prometheusPort,
    userMetricReader,
    tracesActive,
    userTraceExporter,
    serviceName,
}: {
    metricsActive: boolean
    prometheusPort: number
    userMetricReader?: MetricReader
    userTraceExporter?: SpanExporter
    tracesActive?: boolean,
    serviceName?: string,
}): void {
    const resource = Resource.default().merge(
        new Resource({
            [ATTR_SERVICE_NAME]: serviceName ?? "txm",
            [ATTR_SERVICE_VERSION]: version,
        }),
    )

    
    let metricReader: MetricReader | undefined
    if (metricsActive) {
        metricReader = userMetricReader || new PrometheusExporter({ port: prometheusPort })
    }

    let traceExporter: SpanExporter | undefined
    if (tracesActive) {
        traceExporter = userTraceExporter || new ConsoleSpanExporter()
    }

    const sdk = new NodeSDK({
        resource,
        traceExporter,
        metricReader,
    })

    sdk.start()
}
