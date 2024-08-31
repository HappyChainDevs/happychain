import { emitUserUpdate } from "../../utils/emitUserUpdate"
import { hasPermission } from "./hasPermission"
import { clearDappPermissions } from "./utils"

/**
 * Util Shortcut to clear all state for current dapp/user
 */
export function clearPermissions() {
    // if the current dapp already has account permissions, clear them
    if (hasPermission({ eth_accounts: {} })) {
        emitUserUpdate(undefined)
    }

    // delete all permissions
    clearDappPermissions()
}
