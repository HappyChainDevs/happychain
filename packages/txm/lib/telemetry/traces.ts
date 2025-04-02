import { unknownToError } from "@happy.tech/common"
import { context, trace } from "@opentelemetry/api"

export const blockMonitorTracer = trace.getTracer("txm.block-monitor")
export const transactionCollectorTracer = trace.getTracer("txm.transaction-collector")
export const transactionSubmitterTracer = trace.getTracer("txm.transaction-submitter")

export function TraceMethod(spanName?: string) {
    return (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value
        descriptor.value = function (...args: unknown[]) {
            const tracer = trace.getTracer("txm")
            const name = spanName || propertyKey
            const span = tracer.startSpan(name)

            return context.with(trace.setSpan(context.active(), span), () => {
                try {
                    const result = originalMethod.apply(this, args)

                    if (result instanceof Promise) {
                        return result
                            .then((value) => {
                                span.end()
                                return value
                            })
                            .catch((err) => {
                                span.recordException(unknownToError(err))
                                span.end()
                                throw err
                            })
                    }
                    span.end()
                    return result
                } catch (err) {
                    span.recordException(unknownToError(err))
                    span.end()
                    throw err
                }
            })
        }
        return descriptor
    }
}
