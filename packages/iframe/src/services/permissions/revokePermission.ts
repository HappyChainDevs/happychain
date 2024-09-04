import { emitUserUpdate } from "../../utils/emitUserUpdate"
import { getDappPermissions, setDappPermissions } from "./utils"

/**
 * Response to JSON-RPC requests
 * - wallet_revokePermissions
 */
export function revokePermission({ method, params }: { method: string; params: { [key: string]: unknown }[] }) {
    const dappPermissions = getDappPermissions()
    if (!dappPermissions.size) return []

    if (method === "wallet_revokePermissions") {
        for (const param of params) {
            const [[name]] = Object.entries(param)
            dappPermissions.delete(name)
            if (name === "eth_accounts") {
                emitUserUpdate(undefined)
            }
        }
    }

    setDappPermissions(dappPermissions)
}
