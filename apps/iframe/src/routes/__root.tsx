import { Outlet, createRootRoute } from "@tanstack/react-router"
import "#src/connections/initialize"
import { DevTools } from "../components/DevTools"

export const Route = createRootRoute({
    component: RootComponent,
})

// This must be in a file called __root to be picked up by TanStack Router.
function RootComponent() {
    return (
        <DevTools>
            <Outlet />
        </DevTools>
    )
}
