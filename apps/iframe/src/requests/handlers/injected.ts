import { HappyMethodNames } from "@happy.tech/common"
import {
    EIP1193SwitchChainError,
    EIP1474InvalidInput,
    type Msgs,
    type ProviderMsgsFromApp,
} from "@happy.tech/wallet-common"
import { privateKeyToAccount } from "viem/accounts"
import { checkAndChecksumAddress, checkedTx, checkedWatchedAsset } from "#src/requests/utils/checks"
import { sendToInjectedClient, sendToPublicClient } from "#src/requests/utils/sendToClient"
import {
    getSessionKey,
    installNewSessionKey,
    isSessionKeyAuthorized,
    isSessionKeyValidatorInstalled,
    revokeSessionKeys,
} from "#src/requests/utils/sessionKeys"
import {
    FORWARD,
    eth_estimateGas,
    getTransactionByHash,
    getTransactionCount,
    getTransactionReceipt,
} from "#src/requests/utils/shared"
import { eoaSigner, sessionKeySigner } from "#src/requests/utils/signers"
import { getChains, setChains, setCurrentChain } from "#src/state/chains"
import { revokedSessionKeys } from "#src/state/interfaceState"
import { loadAbiForUser } from "#src/state/loadedAbis"
import { getPermissions, grantPermissions, revokePermissions } from "#src/state/permissions"
import { checkUser, getUser } from "#src/state/user"
import { addWatchedAsset } from "#src/state/watchedAssets"
import { appForSourceID } from "#src/utils/appURL"
import { isAddChainParams } from "#src/utils/isAddChainParam"
import { sendBoop } from "../utils/boop"

export async function dispatchInjectedRequest(request: ProviderMsgsFromApp[Msgs.RequestInjected]) {
    const app = appForSourceID(request.windowId)! // checked in sendResponse
    const user = getUser()

    switch (request.payload.method) {
        // Different from permissionless.ts as this actually calls the provider
        // to ensure we still have a connection with the extension wallet
        case HappyMethodNames.USER: {
            const acc = await sendToInjectedClient({ method: "eth_accounts" })
            return acc.length ? user : undefined
        }

        case "eth_call": {
            return await sendToPublicClient(app, request.payload)
        }

        case "eth_sendTransaction": {
            checkUser(user)
            const tx = checkedTx(request.payload.params[0])
            const account = user.address
            const signer = isSessionKeyAuthorized(app, tx.to)
                ? sessionKeySigner(getSessionKey(user.address, tx.to))
                : eoaSigner

            return await sendBoop({ account, tx, signer })
        }

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
            const gasLimit = await eth_estimateGas(user, tx)
            return gasLimit !== FORWARD ? gasLimit : await sendToPublicClient(app, request.payload)
        }

        case HappyMethodNames.REQUEST_SESSION_KEY: {
            checkUser(user)
            const target = checkAndChecksumAddress(request.payload.params[0])

            let isAuthorized = isSessionKeyAuthorized(app, target)
            // In dev, the validator contract may change relatively often, making old keys
            // non-functional, so check that the validator is installed before returning a session key.
            //
            // We'll need to handle this flow in prod whenever we're
            // thinking to do a contract update in a released environment.
            if (import.meta.env.NODE_ENV === "development")
                isAuthorized &&= await isSessionKeyValidatorInstalled(user.address)

            if (isAuthorized) {
                const sessionKey = getSessionKey(user.address, target)
                return privateKeyToAccount(sessionKey).address
            }
            installNewSessionKey(app, user.address, target)
            return
        }

        case "eth_accounts": {
            // not logged in
            if (!user) return []

            let resp = await sendToInjectedClient(request.payload)

            // wallet not connected, we will request permissions here
            // This shouldn't happen however added as a precaution
            if (!resp.length) {
                resp = await sendToInjectedClient({ method: "eth_requestAccounts" })
                if (!resp.length) return []
            }

            // wallet connected as wrong user somehow
            if (resp[0].toLowerCase() !== user.controllingAddress) return []

            grantPermissions(app, "eth_accounts")

            return [user.address]
        }

        case "eth_requestAccounts": {
            checkUser(user)
            const resp = await sendToInjectedClient(request.payload)

            // wallet not connected, we will revoke permissions (they should already be revoked)
            if (!resp.length) {
                revokePermissions(app, "eth_accounts")
                return []
            }

            // Permissions are likely granted, but incase they are not, we can safely grant here
            // since the injected wallet itself also has the permissions granted
            grantPermissions(app, "eth_accounts")

            return [user.address]
        }

        case "wallet_requestPermissions": {
            // NOTE: We don't yet support granting a session key via this method,
            //       use HappyMethodNames.REQUEST_SESSION_KEY.
            const [{ eth_accounts, ...rest }] = request.payload.params
            if (eth_accounts) {
                const injectedResponse = await sendToInjectedClient({
                    method: request.payload.method,
                    params: [{ eth_accounts }],
                })
                if (injectedResponse.length) grantPermissions(app, { eth_accounts })
            }
            if (Object.keys(rest).length) grantPermissions(app, rest)
            return getPermissions(app, request.payload.params[0])
        }

        case "wallet_revokePermissions": {
            const resp = await sendToInjectedClient(request.payload)
            revokePermissions(app, request.payload.params[0])
            if (revokedSessionKeys.size > 0) await revokeSessionKeys(app, [...revokedSessionKeys.values()])
            return resp
        }

        case "wallet_addEthereumChain": {
            const params = Array.isArray(request.payload.params) && request.payload.params[0]
            const isValid = isAddChainParams(params)
            if (!isValid) throw new EIP1474InvalidInput("Invalid wallet_addEthereumChain request body")

            const resp = await sendToInjectedClient(request.payload)

            setChains((prev) => ({ ...prev, [params.chainId]: params }))

            // Some wallets (Metamask, Rabby, ...) automatically switch to the newly-added chain.
            // Normalize behavior by always switching.
            // This usually does not result in an additional prompt in auto-switching wallets.
            await sendToInjectedClient({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: params.chainId }],
            })

            setCurrentChain(params)

            return resp
        }

        case "wallet_switchEthereumChain": {
            const chains = getChains()
            const chainId = request.payload.params[0].chainId
            if (!(chainId in chains))
                throw new EIP1193SwitchChainError("Unrecognized chain ID, try adding the chain first.")
            const resp = await sendToInjectedClient(request.payload)
            setCurrentChain(chains[chainId])
            return resp
        }

        case "wallet_watchAsset": {
            checkUser(user)
            const params = checkedWatchedAsset(request.payload.params)
            return addWatchedAsset(user.address, params)
        }

        case HappyMethodNames.LOAD_ABI: {
            return user ? loadAbiForUser(user.address, request.payload.params) : undefined
        }

        default: {
            return await sendToInjectedClient(request.payload)
        }
    }
}
