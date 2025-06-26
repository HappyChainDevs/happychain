import { use$ } from "@legendapp/state/react"
import { hasPermissions } from "#src/state/permissions"
import type { PermissionsRequest } from "#src/state/permissions/types"
import { type AppURL, getAppURL } from "../utils/appURL"

export function useHasPermissions(permissionsRequest: PermissionsRequest, app: AppURL = getAppURL()) {
    return use$(() => hasPermissions(app, permissionsRequest))
}
