import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { Resource } from "@opentelemetry/resources"
import { NodeSDK } from "@opentelemetry/sdk-node"
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions"
import pkg from "../../package.json" assert { type: "json" }
import { env } from "../env"

const resource = Resource.default().merge(
    new Resource({
        [ATTR_SERVICE_NAME]: "submitter",
        [ATTR_SERVICE_VERSION]: pkg.version,
    }),
)

const traceExporter = env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({
          url: env.OTEL_EXPORTER_OTLP_ENDPOINT,
      })
    : undefined

const sdk = new NodeSDK({
    resource,
    traceExporter,
})

sdk.start()
