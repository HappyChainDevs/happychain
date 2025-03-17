import { Outlet, createRootRoute } from "@tanstack/react-router"
import "#src/connections/initialize"
import { RootLayout } from "#src/v2/layouts/root/layout"
import { DevTools } from "../components/DevTools"

const RootComponent = () => {
    return (
        <DevTools>
            <RootLayout>
                <Outlet />
            </RootLayout>
        </DevTools>
    )
}

export const Route = createRootRoute({
    component: RootComponent,
})
