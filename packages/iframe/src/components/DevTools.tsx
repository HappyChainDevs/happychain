// import { useIsHydrated } from "@happychain/common"
import type { PropsWithChildren } from "react"
import { lazy } from "react"

// import "jotai-devtools/styles.css"

/**
 * Global devtools flags
 */
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
 * Render the UI Jotai devtools in development mode after hydration.
 * Also enables visualizing atoms in the browser's React & Redux devtools.
 *
 * This has to be function so that we avoid calling the hooks during server side rendering.
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
