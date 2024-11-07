import { Outlet, createRootRoute } from "@tanstack/react-router"

import { useSmartAccount } from "#src/hooks/useSmartAccount"
import { DevTools } from "../components/DevTools"

export const Route = createRootRoute({
    component: RootComponent,
})

function RootComponent() {
    useSmartAccount()

    return (
        <DevTools>
            <Outlet />
        </DevTools>
    )
}
