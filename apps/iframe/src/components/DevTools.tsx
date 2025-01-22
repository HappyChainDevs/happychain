import type { PropsWithChildren } from "react"
import { lazy } from "react"

// Global devtools flags

const inProduction = import.meta.env.MODE === "production"
const inIframe = window.parent !== window
const useDevTools = !inIframe && !inProduction

/**
 * Tanstack Router Devtools
 */
const LazyLoadTanStackRouterDevtools = !useDevTools
    ? () => null // Render nothing in production or embedded in iframe
    : lazy(() =>
          // Lazy load in development
          import("@tanstack/router-devtools").then((res) => ({
              default: res.TanStackRouterDevtools,
              // For Embedded Mode
              // default: res.TanStackRouterDevtoolsPanel
          })),
      )

/**
 * Jotai Devtools
 */
const LazyLoadJotaiDevTools = !useDevTools
    ? () => null // Render nothing in production or embedded in iframe
    : lazy(() =>
          import("./JotaiDevTools").then((res) => ({
              default: res.JotaiDevTools,
          })),
      )

/**
 * Render the UI Jotai devtools in development mode.
 * Also enables visualizing atoms in the browser's React & Redux devtools.
 */
export function DevTools({ children }: PropsWithChildren) {
    if (!useDevTools) return children

    return (
        <>
            {children}
            <LazyLoadTanStackRouterDevtools />
            <LazyLoadJotaiDevTools />
        </>
    )
}
