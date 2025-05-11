import { HappyMethodNames } from "@happy.tech/common"
import { EIP1193SwitchChainError, EIP1474InvalidInput, type Msgs, type PopupMsgs } from "@happy.tech/wallet-common"
import { sendBoop } from "#src/requests/utils/boop"
import { checkedAddress, checkedTx } from "#src/requests/utils/checks"
import { sendToWalletClient } from "#src/requests/utils/sendToClient"
import { installNewSessionKey } from "#src/requests/utils/sessionKeys"
import { eoaSigner } from "#src/requests/utils/signers"
import { getChains, getCurrentChain, setChains, setCurrentChain } from "#src/state/chains"
import { loadAbiForUser } from "#src/state/loadedAbis"
import { grantPermissions } from "#src/state/permissions"
import { checkUser, getUser } from "#src/state/user"
import { addWatchedAsset } from "#src/state/watchedAssets"
import { appForSourceID } from "#src/utils/appURL"
import { isAddChainParams } from "#src/utils/isAddChainParam"
import { reqLogger } from "#src/utils/logger"

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
            // NOTE: We don't yet support granting a session key via this method,
            //       use HappyMethodNames.REQUEST_SESSION_KEY.
            return grantPermissions(app, request.payload.params[0])

        case "wallet_addEthereumChain": {
            const params = Array.isArray(request.payload.params) && request.payload.params[0]
            const isValid = isAddChainParams(params)
            if (!isValid) throw new EIP1474InvalidInput("Invalid wallet_addEthereumChain request body")

            const response = await sendToWalletClient(request.payload)
            // Only add chain if the request is successful.
            setChains((prev) => ({ ...prev, [params.chainId]: params }))
            return response
        }

        case "wallet_switchEthereumChain": {
            const chains = getChains()
            const chainId = request.payload.params[0].chainId
            if (!(chainId in chains))
                throw new EIP1193SwitchChainError("Unrecognized chain ID, try adding the chain first.")
            if (chainId === getCurrentChain()?.chainId) return null // correct response for a successful request
            const response = await sendToWalletClient(request.payload)
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
