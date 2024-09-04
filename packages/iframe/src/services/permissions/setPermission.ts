import { getDefaultStore } from "jotai"
import type { WalletPermissionRequest } from "../../state/permissions"
import { userAtom } from "../../state/user"
import { emitUserUpdate } from "../../utils/emitUserUpdate"

import { createWalletPermission, getDappPermissions, setDappPermissions } from "./utils"

const store = getDefaultStore()

type EthRequestAccounts = { method: "eth_requestAccounts"; params?: unknown }
type WalletRequestPermissions = { method: "wallet_requestPermissions"; params: WalletPermissionRequest[] }
type Params = EthRequestAccounts | WalletRequestPermissions

/**
 * Action for JSON-RPC request
 * - wallet_requestPermissions
 *
 * @notice
 * Caveats are not yet supported
 *
 * @return WalletPermissions
 */
export function setPermission({ method, params }: Params) {
    const dappPermissions = getDappPermissions()

    if (method === "eth_requestAccounts") {
        // store permissions for future
        dappPermissions.set("eth_accounts", createWalletPermission("eth_accounts"))
        emitUserUpdate(store.get(userAtom))
    }

    if (method === "wallet_requestPermissions") {
        for (const param of params) {
            const [[name, value]] = Object.entries(param)

            if (value && typeof value === "object" && Object.keys(value).length) {
                throw new Error("WalletPermissionCaveats Not Yet Supported")
            }

            dappPermissions.set(name, createWalletPermission(name))

            if (name === "eth_accounts") {
                // allow dapp to access user
                emitUserUpdate(store.get(userAtom))
            }
        }
    }

    setDappPermissions(dappPermissions)
}
