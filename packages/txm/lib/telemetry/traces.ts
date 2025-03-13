import { unknownToError } from "@happy.tech/common"
import { trace } from "@opentelemetry/api"

export const blockMonitorTracer = trace.getTracer("txm.block-monitor")
export const transactionCollectorTracer = trace.getTracer("txm.transaction-collector")
export const transactionSubmitterTracer = trace.getTracer("txm.transaction-submitter")

export function TraceMethod(spanName?: string) {
    return (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value
        descriptor.value = function (...args: unknown[]) {
            const tracer = trace.getTracer("txm")
            const name = spanName || propertyKey
            return tracer.startActiveSpan(name, async (span) => {
                try {
                    const result = await originalMethod.apply(this, args)
                    return result
                } catch (err) {
                    span.recordException(unknownToError(err))
                    throw err
                } finally {
                    span.end()
                }
            })
        }
        return descriptor
    }
}
