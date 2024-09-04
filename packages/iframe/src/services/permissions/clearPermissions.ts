import { clearDappPermissions } from "./utils"

/**
 * Util Shortcut to clear all state for current dapp/user
 */
export function clearPermissions() {
    // delete all permissions
    clearDappPermissions()
}
