import { bigIntReplacer, unknownToError } from "@happy.tech/common"
import { context, trace } from "@opentelemetry/api"
import { createMiddleware } from "hono/factory"

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function traceFunction<F extends (...args: any[]) => ReturnType<F>>(fn: F, spanName?: string): F {
    return function (this: unknown, ...args: Parameters<F>): ReturnType<F> {
        const tracer = trace.getTracer("submitter")
        const span = tracer.startSpan(spanName || fn.name)

        return context.with(trace.setSpan(context.active(), span), () => {
            try {
                for (let i = 0; i < args.length; i++) {
                    const arg = args[i]
                    span.setAttribute(`function.arg.${i}`, JSON.stringify(arg, bigIntReplacer))
                }

                const result = fn.apply(this, args)

                if (result instanceof Promise) {
                    return result
                        .then((v) => {
                            span.end()
                            return v
                        })
                        .catch((err) => {
                            span.recordException(unknownToError(err))
                            span.end()
                            throw err
                        }) as ReturnType<F>
                }

                span.setAttribute("function.result", JSON.stringify(result, bigIntReplacer))

                span.end()
                return result
            } catch (err) {
                span.recordException(unknownToError(err))
                span.end()
                throw err
            }
        })
    } as F
}

/**
 * A method decorator that adds OpenTelemetry tracing to any method. It creates a new span with the provided name
 * (or the method name if not provided), executes the decorated method, and ensures the span is properly closed.
 *
 * The decorator handles both synchronous and asynchronous methods appropriately. For synchronous methods,
 * the span is ended immediately after execution. For asynchronous methods, the span is ended after the promise
 * resolves or rejects. This approach preserves the original method signature (sync methods remain sync,
 * async remain async).
 *
 * If an exception occurs during execution, it is recorded in the span before being re-thrown.
 *
 * @param spanName - Optional custom name for the span. If not provided, the method name is used.
 */
export function TraceMethod(spanName?: string) {
    return (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value
        descriptor.value = function (...args: unknown[]) {
            const tracer = trace.getTracer("submitter")
            const name = spanName || propertyKey
            const span = tracer.startSpan(name)

            // IMPORTANT: The callback must not be async to preserve the original method's synchronicity.
            // An async callback would implicitly return a Promise, which would convert synchronous methods
            // into asynchronous ones, breaking caller expectations and type signatures.
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

export const traceMiddleware = createMiddleware(async (c, next) => {
    const tracer = trace.getTracer("submitter")
    const span = tracer.startSpan(`${c.req.method} ${c.req.path}`)

    return context.with(trace.setSpan(context.active(), span), async () => {
        try {
            await next()

            span.setAttribute("http.method", c.req.method)
            span.setAttribute("http.route", c.req.path)
            span.setAttribute("http.status", c.res.status)
        } catch (err) {
            span.recordException(err as Error)
            throw err
        } finally {
            span.end()
        }
    })
})
