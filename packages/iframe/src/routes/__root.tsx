import { useIsHydrated } from "@happychain/common"
import { Outlet, createRootRoute } from "@tanstack/react-router"
import { lazy } from "react"
import { JotaiDebug } from "../components/JotaiDebug"

const inProduction = import.meta.env.MODE === "production"
const inIframe = window.parent !== window.self

const TanStackRouterDevtools =
    inProduction || inIframe
        ? () => null // Render nothing in production or embedded in iframe
        : lazy(() =>
              // Lazy load in development
              import("@tanstack/router-devtools").then((res) => ({
                  default: res.TanStackRouterDevtools,
                  // For Embedded Mode
                  // default: res.TanStackRouterDevtoolsPanel
              })),
          )

export const Route = createRootRoute({
    component: RootComponent,
})

function RootComponent() {
    const isHydrated = useIsHydrated()
    return (
        <>
            <Outlet />
            <JotaiDebug isHydrated={isHydrated} />
            <TanStackRouterDevtools />
        </>
    )
}
