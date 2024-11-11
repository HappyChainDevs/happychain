import { Outlet, createRootRoute } from "@tanstack/react-router"
import "#src/connections/initialize.ts"
import { DevTools } from "../components/DevTools"

export const Route = createRootRoute({
    component: RootComponent,
})

function RootComponent() {
    return (
        <DevTools>
            <Outlet />
        </DevTools>
    )
}