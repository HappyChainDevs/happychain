import { PrometheusExporter } from "@opentelemetry/exporter-prometheus"
import { Resource } from "@opentelemetry/resources"
import type { MetricReader } from "@opentelemetry/sdk-metrics"
import { NodeSDK } from "@opentelemetry/sdk-node"
import { ConsoleSpanExporter, type SpanExporter } from "@opentelemetry/sdk-trace-node"
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions"
import { ViemInstrumentation } from "@pimlico/opentelemetry-instrumentation-viem"

const resource = Resource.default().merge(
    new Resource({
        [ATTR_SERVICE_NAME]: "txm",
        [ATTR_SERVICE_VERSION]: "0.1.0",
    }),
)

export function initializeTelemetry({
    metricsActive,
    prometheusPort,
    userMetricReader,
    tracesActive,
    userTraceExporter,
}: {
    metricsActive: boolean
    prometheusPort: number
    userMetricReader?: MetricReader
    userTraceExporter?: SpanExporter
    tracesActive?: boolean
}): void {
    let metricReader: MetricReader | undefined
    if (metricsActive) {
        metricReader = userMetricReader || new PrometheusExporter({ port: prometheusPort })
    }

    let traceExporter: SpanExporter | undefined
    if (tracesActive) {
        traceExporter = userTraceExporter || new ConsoleSpanExporter()
    }

    const viemInstrumentation = new ViemInstrumentation({
        requireParentSpan: true,
        captureOperationResult: true,
    })

    const sdk = new NodeSDK({
        resource,
        traceExporter,
        metricReader,
        instrumentations: [viemInstrumentation],
    })

    sdk.start()
    viemInstrumentation.enable()
}