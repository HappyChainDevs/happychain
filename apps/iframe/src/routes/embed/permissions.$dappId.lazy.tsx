import { createLazyFileRoute } from "@tanstack/react-router"
import { ScreenAppPermissions } from "#src/v2/screens/permissions/[$dappId]/AppPermissions"

export const Route = createLazyFileRoute("/embed/permissions/$dappId")({
    component: ScreenAppPermissions,
})
