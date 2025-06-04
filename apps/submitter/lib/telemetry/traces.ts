import { context, trace } from "@opentelemetry/api";
import { unknownToError } from "@happy.tech/common";
import { createMiddleware } from "hono/factory";

export function traceFunction<
  F extends (...args: any[]) => ReturnType<F>
>(fn: F, spanName?: string): F {
  return function (this: unknown, ...args: Parameters<F>): ReturnType<F> {
    const tracer = trace.getTracer("submitter");
    const span = tracer.startSpan(spanName || fn.name);

    return context.with(trace.setSpan(context.active(), span), () => {
      try {
        const result = fn.apply(this, args);

        if (result instanceof Promise) {
          return result
            .then((v) => {
              span.end();
              return v;
            })
            .catch((err) => {
              span.recordException(unknownToError(err));
              span.end();
              throw err;
            }) as ReturnType<F>;
        }

        span.end();
        return result;
      } catch (err) {
        span.recordException(unknownToError(err));
        span.end();
        throw err;
      }
    });
  } as F;
}


export const traceMiddleware = createMiddleware(async (c, next) => {
    const tracer = trace.getTracer('submitter')
    const span  = tracer.startSpan(`${c.req.method} ${c.req.path}`)
  
    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        await next()
  
        span.setAttribute('http.method',  c.req.method)
        span.setAttribute('http.route',   c.req.path)
        span.setAttribute('http.status',  c.res.status)
      } catch (err) {
        span.recordException(err as Error)
        throw err
      } finally {
        span.end()
      }
    })
})