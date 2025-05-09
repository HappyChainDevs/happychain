import { Outlet, createRootRoute } from "@tanstack/react-router"
import "#src/connections/initialize.ts"
import { RouteTransitionListener } from "#src/components/RouteTransitionListener.tsx"
import { DevTools } from "../components/DevTools"

export const Route = createRootRoute({
    component: RootComponent,
})

function RootComponent() {
    return (
        <DevTools>
            <RouteTransitionListener />
            <Outlet />
        </DevTools>
    )
}
