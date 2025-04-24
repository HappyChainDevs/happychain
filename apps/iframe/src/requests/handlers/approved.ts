import { reqLogger } from "#src/logger"
import { checkedAddress, checkedTx } from "#src/requests/utils/checks"
import { sendToWalletClient } from "#src/requests/utils/sendToClient"
import { eoaSigner } from "#src/requests/utils/signers"
import { getChains, getCurrentChain, setChains, setCurrentChain } from "#src/state/chains"
import { loadAbiForUser } from "#src/state/loadedAbis"
import { grantPermissions } from "#src/state/permissions"
import { checkUser, getUser } from "#src/state/user"
import { addWatchedAsset } from "#src/state/watchedAssets"
import { appForSourceID } from "#src/utils/appURL"
import { isAddChainParams } from "#src/utils/isAddChainParam"
import { HappyMethodNames } from "@happy.tech/common"
import { EIP1193ErrorCodes, getEIP1193ErrorObjectFromCode, type Msgs, type PopupMsgs } from "@happy.tech/wallet-common"
import { sendBoop } from "../utils/boop"
import { installNewSessionKey } from "../utils/sessionKeys"

export async function dispatchApprovedRequest(request: PopupMsgs[Msgs.PopupApprove]) {
    const app = appForSourceID(request.windowId)! // checked in sendResponse

    const user = getUser()
    if (!user) {
        reqLogger.warn("Request approved, but no user found")
        checkUser(user) // will throw & assert type
    }

    switch (request.payload.method) {
        case "eth_sendTransaction": {
            const tx = checkedTx(request.payload.params[0])
            return await sendBoop({ account: user.address, tx, signer: eoaSigner })
        }

        case "eth_requestAccounts": {
            grantPermissions(app, "eth_accounts")
            return [user.address]
        }

        case "wallet_requestPermissions":
            return grantPermissions(app, request.payload.params[0])

        case "wallet_addEthereumChain": {
            const chains = getChains()
            const params = Array.isArray(request.payload.params) && request.payload.params[0]
            const isValid = isAddChainParams(params)

            if (!isValid)
                throw getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.SwitchChainError, "Invalid request body")

            if (params.chainId in chains)
                throw getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.SwitchChainError, "Chain already exists")

            const response = await sendToWalletClient(request.payload)
            // Only add chain if the request is successful.
            setChains((prev) => ({ ...prev, [params.chainId]: params }))
            return response
        }

        case "wallet_switchEthereumChain": {
            const chains = getChains()
            const chainId = request.payload.params[0].chainId

            // ensure chain has already been added
            if (!(chainId in chains)) {
                throw getEIP1193ErrorObjectFromCode(
                    EIP1193ErrorCodes.SwitchChainError,
                    "Unrecognized chain ID, try adding the chain first.",
                )
            }

            if (chainId === getCurrentChain()?.chainId) return null // correct response for a successful request

            const response = await sendToWalletClient(request.payload)
            // Currently this always fails: web3Auth is hardcoded to the default intial chain.
            setCurrentChain(chains[chainId])
            return response
        }

        case "wallet_watchAsset": {
            return addWatchedAsset(user.address, request.payload.params)
        }

        case HappyMethodNames.LOAD_ABI: {
            return loadAbiForUser(user.address, request.payload.params)
        }

        case HappyMethodNames.REQUEST_SESSION_KEY: {
            // If this lands in the approved handler, we know there are no session keys for the target address.
            const target = checkedAddress(request.payload.params[0])
            return installNewSessionKey(app, user.address, target)
        }

        default:
            return await sendToWalletClient(request.payload)
    }
}
