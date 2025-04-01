import { createLazyFileRoute } from "@tanstack/react-router"
import { PATHNAME_DAPPS_WITH_PERMISSIONS, ScreenPermissions } from "#src/v2/screens/permissions/Permissions.tsx"

export const Route = createLazyFileRoute(PATHNAME_DAPPS_WITH_PERMISSIONS)({
    component: ScreenPermissions,
})
