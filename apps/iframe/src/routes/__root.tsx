import { Outlet, createRootRoute, useRouter } from "@tanstack/react-router"
import { revokedSessionKeys } from "#src/state/interfaceState"
import type { AppURL } from "#src/utils/appURL"
import "#src/connections/initialize"
import { useEffect } from "react"
import { revokeSessionKeys } from "#src/requests/utils/sessionKeys"
import { DevTools } from "../components/DevTools"

export const Route = createRootRoute({
    component: RootComponent,
})

// This must be in a file called __root to be picked up by TansStack Router.
function RootComponent() {
    const router = useRouter()
    useEffect(() => {
        // This fires after a route transition completes.
        // cf. https://tanstack.com/router/latest/docs/framework/react/api/router/RouterType#subscribe-method
        // cf. https://tanstack.com/router/latest/docs/framework/react/api/router/RouterEventsType
        return router.subscribe("onResolved", async (event) => {
            const isFromAppPermissionsPage = event.fromLocation?.pathname.match(/^\/embed\/permissions\/(.+)$/)
            // Checks if the navigation originated from `/embed/permissions/:appURL` and, if
            // so, revokes the permissions of the session keys associated with the app.
            if (isFromAppPermissionsPage) {
                const app = decodeURIComponent(isFromAppPermissionsPage[1]) as AppURL
                await revokeSessionKeys(app, [...revokedSessionKeys.values()])
            }
        })
    }, [router])

    return (
        <DevTools>
            <Outlet />
        </DevTools>
    )
}
