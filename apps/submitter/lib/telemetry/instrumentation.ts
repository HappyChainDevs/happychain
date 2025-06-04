import { Resource } from "@opentelemetry/resources"
import { NodeSDK } from "@opentelemetry/sdk-node"
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node"
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions"
import pkg from "../../package.json" assert { type: "json" }

const resource = Resource.default().merge(
    new Resource({
        [ATTR_SERVICE_NAME]: "submitter",
        [ATTR_SERVICE_VERSION]: pkg.version,
    }),
)

export function initializeTelemetry(): void {
    const traceExporter = new ConsoleSpanExporter()

    const sdk = new NodeSDK({
        resource,
        traceExporter,
    })

    sdk.start()
}
