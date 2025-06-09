import { trace } from "@opentelemetry/api"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http/build/esnext"
import { Resource } from "@opentelemetry/resources"
import { NodeSDK } from "@opentelemetry/sdk-node"
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions"
import pkg from "../../package.json" assert { type: "json" }
import { env } from "../env"

export const serviceName = `submitter-${env.NODE_ENV}`

const resource = Resource.default().merge(
    new Resource({
        [ATTR_SERVICE_NAME]: serviceName,
        [ATTR_SERVICE_VERSION]: pkg.version,
    }),
)

const traceExporter = env.TRACES_ENDPOINT
    ? new OTLPTraceExporter({
          url: env.TRACES_ENDPOINT,
      })
    : undefined

const sdk = new NodeSDK({
    resource,
    traceExporter,
})

export const tracer = trace.getTracer(serviceName)

sdk.start()
