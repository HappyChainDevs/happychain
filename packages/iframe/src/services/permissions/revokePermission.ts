import { emitUserUpdate } from "../../utils/emitUserUpdate"
import { getDappPermissions, setDappPermissions } from "./utils"

/**
 * Response to JSON-RPC requests
 * - wallet_revokePermissions
 */
export function revokePermission({ method, params }: { method: string; params: { [key: string]: unknown }[] }) {
    const referrer = getDappPermissions()
    if (!referrer.size) return []

    if (method === "wallet_revokePermissions") {
        for (const param of params) {
            const [[name]] = Object.entries(param)
            referrer.delete(name)
            if (name === "eth_accounts") {
                emitUserUpdate(undefined)
            }
        }
    }

    setDappPermissions(referrer)
}
