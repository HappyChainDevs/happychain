import { HappyMethodNames } from "@happy.tech/common"
import {
    EIP1193SwitchChainError,
    EIP1193UnauthorizedError,
    EIP1474InvalidInput,
    type Msgs,
    type ProviderMsgsFromApp,
    WalletType,
} from "@happy.tech/wallet-common"
import { privateKeyToAccount } from "viem/accounts"
import { sendBoop } from "#src/requests/utils/boop"
import { checkAndChecksumAddress, checkedTx, checkedWatchedAsset, hasNonZeroValue } from "#src/requests/utils/checks"
import { sendToPublicClient, sendToWalletClient } from "#src/requests/utils/sendToClient"
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
import { setCurrentChain } from "#src/state/chains"
import { getChains, setChain } from "#src/state/chains/index"
import { revokedSessionKeys } from "#src/state/interfaceState"
import { loadAbiForUser } from "#src/state/loadedAbis"
import { getPermissions, grantPermissions, revokePermissions } from "#src/state/permissions"
import { checkUser, getUser } from "#src/state/user"
import { addWatchedAsset } from "#src/state/watchedAssets"
import { appForSourceID, isWallet } from "#src/utils/appURL"
import { isAddChainParams } from "#src/utils/isAddChainParam"

export async function dispatchInjectedRequest(request: ProviderMsgsFromApp[Msgs.RequestInjected]) {
    const app = appForSourceID(request.windowId)! // checked in sendResponse
    const user = getUser()

    // If user exists, it _must_ be an injected wallet
    // if user does not exist, it may be connecting
    if (user && user.type !== WalletType.Injected) throw new EIP1193UnauthorizedError("User is not an injected wallet")

    switch (request.payload.method) {
        // Different from permissionless.ts as this actually calls the provider
        // to ensure we still have a connection with the extension wallet
        case HappyMethodNames.USER: {
            const acc = await sendToWalletClient({ method: "eth_accounts" })
            return acc.length ? user : undefined
        }

        case "personal_sign": {
            checkUser(user)
            return await sendToWalletClient({
                method: "personal_sign",
                params: [
                    request.payload.params[0],
                    // Contracts can't sign, but the account accepts signature from its owners via EIP-1271.
                    user.controllingAddress,
                ],
            })
        }

        case "eth_call": {
            return await sendToPublicClient(app, request.payload)
        }

        case "wallet_sendTransaction":
        case "eth_sendTransaction": {
            checkUser(user)
            const tx = checkedTx(request.payload.params[0])
            const account = user.address
            const signer =
                !hasNonZeroValue(tx) && isSessionKeyAuthorized(app, tx.to)
                    ? sessionKeySigner(getSessionKey(user.address, tx.to))
                    : eoaSigner
            return await sendBoop({ account, tx, signer }, app)
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
            const gasLimit = await eth_estimateGas(user, tx, app)
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
            if (import.meta.env.DEV) isAuthorized &&= await isSessionKeyValidatorInstalled(user.address)

            if (isAuthorized) {
                const sessionKey = getSessionKey(user.address, target)
                return privateKeyToAccount(sessionKey).address
            }
            await installNewSessionKey(app, user.address, target)
            return
        }

        case "eth_accounts": {
            // not logged in
            if (!user) return []

            let resp = await sendToWalletClient(request.payload)

            // wallet not connected, we will request permissions here
            // This shouldn't happen however added as a precaution. If there is a user
            // there should _always_ be a wallet connected.
            if (!resp.length) {
                resp = await sendToWalletClient({ method: "eth_requestAccounts" })
                if (!resp.length) return []
            }

            // wallet connected as wrong user somehow
            if (checkAndChecksumAddress(resp[0]) !== user.controllingAddress) return []

            grantPermissions(app, "eth_accounts")

            return [user.address]
        }

        case "eth_requestAccounts": {
            checkUser(user)
            const resp = await sendToWalletClient(request.payload)

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
                const injectedResponse = await sendToWalletClient({
                    method: request.payload.method,
                    params: [{ eth_accounts }],
                })
                if (injectedResponse.length) grantPermissions(app, { eth_accounts })
            }
            if (Object.keys(rest).length) grantPermissions(app, rest)
            return getPermissions(app, request.payload.params[0])
        }

        case "wallet_revokePermissions": {
            // We only intentionally revoke injected connection if requested from within the iframe.
            // This happens on an actual 'logout' action, not just an app disconnect.
            if (isWallet(app)) await sendToWalletClient(request.payload)
            revokePermissions(app, request.payload.params[0])
            if (revokedSessionKeys.size > 0) await revokeSessionKeys(app, [...revokedSessionKeys.values()])
            return null
        }

        case "wallet_addEthereumChain": {
            if (import.meta.env.PROD) {
                throw new EIP1474InvalidInput("Feature not available in production")
            }
            const params = Array.isArray(request.payload.params) && request.payload.params[0]
            const isValid = isAddChainParams(params)
            if (!isValid) throw new EIP1474InvalidInput("Invalid wallet_addEthereumChain request body")

            const resp = await sendToWalletClient(request.payload)

            setChain(params)

            // Some wallets (Metamask, Rabby, ...) automatically switch to the newly-added chain.
            // Normalize behavior by always switching.
            // This usually does not result in an additional prompt in auto-switching wallets.
            await sendToWalletClient({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: params.chainId }],
            })

            setCurrentChain(params)

            return resp
        }

        case "wallet_switchEthereumChain": {
            if (import.meta.env.PROD) {
                throw new EIP1193SwitchChainError("Feature not available in production")
            }
            const chains = getChains()
            const chainId = request.payload.params[0].chainId
            if (!(chainId in chains))
                throw new EIP1193SwitchChainError("Unrecognized chain ID, try adding the chain first.")
            const resp = await sendToWalletClient(request.payload)
            setCurrentChain(chains[chainId])
            return resp
        }

        case "wallet_watchAsset": {
            checkUser(user)
            const params = checkedWatchedAsset(request.payload.params)
            return addWatchedAsset(params)
        }

        case HappyMethodNames.LOAD_ABI: {
            return user ? loadAbiForUser(user.address, request.payload.params) : undefined
        }

        default: {
            return await sendToWalletClient(request.payload)
        }
    }
}
