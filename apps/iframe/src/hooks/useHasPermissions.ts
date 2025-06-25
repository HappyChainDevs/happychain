import { use$ } from "@legendapp/state/react"
import type { PermissionsRequest } from "#src/state/permissions/types"
import { hasPermissions } from "#src/state/permissions"
import { type AppURL, getAppURL } from "../utils/appURL"

export function useHasPermissions(permissionsRequest: PermissionsRequest, app: AppURL = getAppURL()) {
    return use$(() => hasPermissions(app, permissionsRequest))
}
