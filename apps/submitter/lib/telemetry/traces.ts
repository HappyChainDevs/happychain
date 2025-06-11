import { bigIntReplacer, unknownToError } from "@happy.tech/common"
import { context, trace } from "@opentelemetry/api"
import { createMiddleware } from "hono/factory"
import { tracer } from "./instrumentation"
import { httpInFlightRequestsGauge, httpRequestDurationHistogram, httpRequestsCounter, httpResponseSizeHistogram } from "./metrics"

const __server_only__ = await "top-level await will fail in browser bundles"

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function createTracedFunction<F extends (...args: any[]) => any>(
    originalFn: F,
    spanName: string,
    thisArg?: unknown,
): F {
    return function (this: unknown, ...args: Parameters<F>): ReturnType<F> {
        const span = tracer.startSpan(spanName)

        // IMPORTANT: The callback must not be async to preserve the original method's synchronicity.
        // An async callback would implicitly return a Promise, which would convert synchronous methods
        // into asynchronous ones, breaking caller expectations and type signatures.
        return context.with(trace.setSpan(context.active(), span), () => {
            try {
                for (let i = 0; i < args.length; i++) {
                    const arg = args[i]
                    span.setAttribute(`function.arg.${i}`, JSON.stringify(arg, bigIntReplacer))
                }

                const result = originalFn.apply(thisArg ?? this, args)

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
 * A higher-order function that wraps any function with OpenTelemetry tracing capabilities.
 * It creates a new span for each function call, tracks arguments and results, and ensures
 * proper span lifecycle management.
 *
 * The function handles both synchronous and asynchronous functions appropriately:
 * - For synchronous functions: the span ends immediately after execution
 * - For async functions: the span ends after the promise resolves or rejects
 *
 * All function arguments are automatically captured as span attributes, and any errors
 * that occur during execution are recorded before being re-thrown.
 *
 * @example
 * // Wrapping a synchronous function
 * const tracedSync = traceFunction((a: number, b: number) => a + b, "add-numbers")
 *
 * // Wrapping an async function
 * const tracedAsync = traceFunction(async (id: string) => fetchUser(id), "fetch-user")
 *
 * @param fn - The function to be traced. Can be either synchronous or asynchronous
 * @param spanName - Optional custom name for the span. If not provided, uses the original function's name
 * @returns A wrapped version of the original function that includes tracing
 */
// biome-ignore lint/suspicious/noExplicitAny: Function needs to work with any type of arguments
export function traceFunction<F extends (...args: any[]) => ReturnType<F>>(fn: F, spanName?: string): F {
    return createTracedFunction(fn, spanName || fn.name)
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
    return (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor): void => {
        const originalMethod = descriptor.value
        descriptor.value = function (...args: unknown[]) {
            return createTracedFunction(originalMethod, spanName || propertyKey, this)(...args)
        }
    }
}

let inFlight = 0

export const instrumentHttpMiddleware = createMiddleware(async (c, next) => {
    const span = tracer.startSpan(`${c.req.method} ${c.req.path}`)

    return context.with(trace.setSpan(context.active(), span), async () => {
        try {
            const start = Date.now()
            httpInFlightRequestsGauge.record(++inFlight)
            await next()
            httpInFlightRequestsGauge.record(--inFlight)
            httpRequestDurationHistogram.record(Date.now() - start, { "method": c.req.method, "path": c.req.path, "status": c.res.status })
            httpRequestsCounter.add(1, { "method": c.req.method, "path": c.req.path, "status": c.res.status })
            httpResponseSizeHistogram.record(Number(c.res.headers.get("content-length")) ?? 0, { "method": c.req.method, "path": c.req.path, "status": c.res.status })
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
