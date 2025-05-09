import { type RouterEvents, useRouter } from "@tanstack/react-router"
import { useEffect } from "react"
import { revokeSessionKeyPermissions } from "#src/requests/utils/sessionKeys.ts"
import type { AppURL } from "#src/utils/appURL.ts"

/**
 * `RouteTransitionListener` uses TanStack Router's `subscribe` method to listen for
 * the `onResolved` navigation event, which fires after a route transition completes.
 *
 * This listener should be mounted in a persistent layout (e.g., root layout) to capture
 * all relevant navigations throughout the app.
 *
 * cf. https://tanstack.com/router/latest/docs/framework/react/api/router/RouterType#subscribe-method
 * cf. https://tanstack.com/router/latest/docs/framework/react/api/router/RouterEventsType
 */
export function RouteTransitionListener() {
    const router = useRouter()
    const eventType = "onResolved" as const

    useEffect(() => {
        const unsubscribe = router.subscribe(eventType, async (event: RouterEvents[typeof eventType]) => {
            const isFromAppPermissionsPage = event.fromLocation?.pathname.match(/^\/embed\/permissions\/(.+)$/)

            /**
             * It checks if the navigation originated from `/embed/permissions/:appId` and, if so,
             * invokes {@link revokeSessionKeyPermissions} with the extracted `appId`.
             */
            if (isFromAppPermissionsPage) {
                await revokeSessionKeyPermissions(isFromAppPermissionsPage[1] as AppURL)
            }
        })

        return unsubscribe
    }, [router, eventType])

    return null
}
