import { HappyMethodNames } from "@happy.tech/common"
import {
    EIP1193SwitchChainError,
    EIP1193UserRejectedRequestError,
    EIP1474InvalidInput,
    type Msgs,
    type ProviderMsgsFromApp,
} from "@happy.tech/wallet-common"
import { isAddress } from "viem"
import { sendBoop } from "#src/requests/utils/boop"
import { checkAndChecksumAddress, checkAuthenticated, checkedTx, hasNonZeroValue } from "#src/requests/utils/checks"
import { sendToPublicClient } from "#src/requests/utils/sendToClient"
import { checkSessionKeyAuthorized, getSessionKey, revokeSessionKeys } from "#src/requests/utils/sessionKeys"
import {
    FORWARD,
    eth_estimateGas,
    getTransactionByHash,
    getTransactionCount,
    getTransactionReceipt,
} from "#src/requests/utils/shared"
import { sessionKeySigner } from "#src/requests/utils/signers"
import { getCurrentChain } from "#src/state/chains"
import { revokedSessionKeys } from "#src/state/interfaceState"
import { getAllPermissions, getPermissions, hasPermissions, revokePermissions } from "#src/state/permissions"
import { getCheckedUser, getUser } from "#src/state/user"
import { appForSourceID } from "#src/utils/appURL"

export async function dispatchedPermissionlessRequest(request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    const app = appForSourceID(request.windowId)! // checked in sendResponse
    const user = getUser()

    switch (request.payload.method) {
        case "eth_chainId": {
            return getCurrentChain().chainId
        }

        case "wallet_sendTransaction":
        case "eth_sendTransaction": {
            // A permissionless transaction is always a session key transaction!
            const tx = checkedTx(request.payload.params[0])
            const account = getCheckedUser().address
            checkSessionKeyAuthorized(app, tx.to)
            if (hasNonZeroValue(tx)) throw new EIP1474InvalidInput("Session key transactions cannot send gas tokens")
            return await sendBoop({ account, tx, signer: sessionKeySigner(getSessionKey(account, tx.to)) }, app)
        }

        case "eth_accounts": {
            return user && hasPermissions(app, "eth_accounts") ? [user.address] : []
        }

        case HappyMethodNames.USER: {
            return user && hasPermissions(app, "eth_accounts") ? getUser() : undefined
        }

        case "eth_requestAccounts":
            checkAuthenticated()
            if (!hasPermissions(app, "eth_accounts")) throw new EIP1193UserRejectedRequestError()
            return isAddress(`${getUser()?.address}`) ? [getUser()?.address] : []

        case "eth_getTransactionByHash": {
            const tx = await getTransactionByHash(request.payload.params[0])
            return tx !== FORWARD ? tx : await sendToPublicClient(app, request.payload)
        }

        case "eth_getTransactionReceipt": {
            const receipt = await getTransactionReceipt(request.payload.params[0])
            return receipt !== FORWARD ? receipt : await sendToPublicClient(app, request.payload)
        }

        case "eth_getTransactionCount": {
            const count = await getTransactionCount(user, request.payload.params)
            return count !== FORWARD ? count : await sendToPublicClient(app, request.payload)
        }

        case "eth_estimateGas": {
            const tx = checkedTx(request.payload.params[0])
            const gasLimit = await eth_estimateGas(user, tx, app)
            return gasLimit !== FORWARD ? gasLimit : await sendToPublicClient(app, request.payload)
        }

        case "wallet_getPermissions":
            return getAllPermissions(app)

        case "wallet_requestPermissions": {
            checkAuthenticated()
            const permissions = request.payload.params[0]
            return hasPermissions(app, permissions) ? getPermissions(app, permissions) : []
        }

        case "wallet_revokePermissions":
            checkAuthenticated()
            revokePermissions(app, request.payload.params[0])
            if (revokedSessionKeys.size > 0) await revokeSessionKeys(app, [...revokedSessionKeys.values()])
            return []

        case "wallet_addEthereumChain":
            if (import.meta.env.PROD) throw new EIP1474InvalidInput("Feature not available in production.")
            // If this is permissionless, the chain already exists, so we simply succeed.
            return null

        case "wallet_switchEthereumChain":
            if (import.meta.env.PROD) throw new EIP1193SwitchChainError("Feature not available in production.")
            // If this is permissionless, we're already on the right chain so we simply succeed.
            return null

        case HappyMethodNames.REQUEST_SESSION_KEY: {
            getCheckedUser()
            const target = checkAndChecksumAddress(request.payload.params[0])
            checkSessionKeyAuthorized(app, target)
            return
        }

        /* // FOR TESTING
           // eth_getBlockByNumber does not need handling, it gets forwarded to the public client by default.
           // But uncommenting this block is helpful in testing error propagation behaviour in three scenarios:
           // - arbitrary errors
           // - our own standard JSON-RPC errors
           // - Viem's own JSON-RPC errors
        case "eth_getBlockByNumber":
            // throw new Error("please display me senpai")
            // throw new EIP1474InvalidInput("wrong syntax kid")
            return await sendToPublicClient(app, {
                method: "eth_getBlockByNumber",
                params: ["yippee kay yay", "motherfucker"],
            })
        //*/

        default:
            return await sendToPublicClient(app, request.payload)
    }
}
