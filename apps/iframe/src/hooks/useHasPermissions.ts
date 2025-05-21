import { use$ } from "@legendapp/state/react"
import { type PermissionsRequest, hasPermissions } from "../state/permissions"
import { type AppURL, getAppURL } from "../utils/appURL"

export function useHasPermissions(permissionsRequest: PermissionsRequest, app: AppURL = getAppURL()) {
    return use$(() => hasPermissions(app, permissionsRequest))
}
