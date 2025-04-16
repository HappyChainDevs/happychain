import { HappyMethodNames, PermissionNames } from "@happy.tech/common"
import {
    EIP1193DisconnectedError,
    EIP1193ErrorCodes,
    type EIP1193RequestResult,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    type Msgs,
    type PopupMsgs,
    getEIP1193ErrorObjectFromCode,
    requestPayloadIsHappyMethod,
} from "@happy.tech/wallet-common"
import { type Client, type Hash, type Hex, InvalidAddressError, isAddress } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { StorageKey, storage } from "#src/services/storage"
import { getChains, setChains } from "#src/state/chains"
import { getCurrentChain, setCurrentChain } from "#src/state/chains"
import { loadAbiForUser } from "#src/state/loadedAbis"
import { grantPermissions } from "#src/state/permissions"
import { getPublicClient } from "#src/state/publicClient"
import { getUser } from "#src/state/user"
import { getWalletClient } from "#src/state/walletClient"
import { addWatchedAsset } from "#src/state/watchedAssets"
import { isAddChainParams } from "#src/utils/isAddChainParam"
import { sendBoop } from "./boop"
import {
    checkIsSessionKeyExtensionInstalled,
    installSessionKeyExtension,
    registerSessionKey,
} from "./extensions/session-keys/helpers"
import { hasExistingSessionKeys } from "./extensions/session-keys/helpers"
import { sendResponse } from "./sendResponse"
import { appForSourceID } from "./utils"

/**
 * Processes requests approved by the user in the pop-up,
 * running them through a series of middleware.
 */
export async function handleApprovedRequest(request: PopupMsgs[Msgs.PopupApprove]): Promise<void> {
    return await sendResponse(request, dispatchHandlers)
}

// exported for testing
export async function dispatchHandlers(request: PopupMsgs[Msgs.PopupApprove]) {
    const app = appForSourceID(request.windowId)! // checked in sendResponse

    const user = getUser()
    if (!user) {
        console.warn("Request approved, but no user found")
    }

    switch (request.payload.method) {
        case "eth_sendTransaction": {
            try {
                if (!user) throw new EIP1193UnauthorizedError()
                const tx = request.payload.params[0]
                return await sendBoop({
                    boopAccount: user.address,
                    tx,
                    signer: async (boopHash: Hash) => {
                        const walletClient = getWalletClient()
                        if (!walletClient) throw new Error("Wallet client not initialized")

                        return (await walletClient.signMessage({
                            account: walletClient.account!,
                            message: { raw: boopHash },
                        })) as Hex
                    },
                })
            } catch (error) {
                console.error("Error processing transaction:", error)
                throw error
            }
        }

        case "eth_requestAccounts": {
            if (!user) return []
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

            const response = await sendToWalletClient({ ...request, payload: request.payload })
            // Only add chain if the request is successful.
            setChains((prev) => ({ ...prev, [params.chainId]: params }))
            return response
        }

        case "wallet_switchEthereumChain": {
            const chains = getChains()
            const chainId = request.payload.params[0].chainId

            if (import.meta.env.PROD) {
                throw new Error("Switching chain is not supported in production")
            }

            // ensure chain has already been added
            if (!(chainId in chains)) {
                throw getEIP1193ErrorObjectFromCode(
                    EIP1193ErrorCodes.SwitchChainError,
                    "Unrecognized chain ID, try adding the chain first.",
                )
            }

            if (chainId === getCurrentChain()?.chainId) return null // correct response for a successful request

            const response = await sendToWalletClient({ ...request, payload: request.payload })
            // Currently this fails: web3Auth is hardcoded to the default intial chain.
            setCurrentChain(chains[chainId])
            return response
        }

        case "wallet_watchAsset": {
            return user ? addWatchedAsset(user.address, request.payload.params) : false
        }

        case HappyMethodNames.LOAD_ABI: {
            return user ? loadAbiForUser(user.address, request.payload.params) : false
        }

        case HappyMethodNames.REQUEST_SESSION_KEY: {
            if (!user) throw new EIP1193UnauthorizedError()

            // address of contract the session key will be authorized to interact with
            const targetContract = request.payload.params[0]

            if (!isAddress(targetContract)) {
                throw new InvalidAddressError({ address: targetContract })
            }

            const publicClient = getPublicClient()
            // Generate a new session key
            const sessionKey = generatePrivateKey()
            const accountSessionKey = privateKeyToAccount(sessionKey)
            const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}

            let hash: Hash
            // Only check extension installation if we don't have any session keys stored
            if (!hasExistingSessionKeys(user.address)) {
                const isSessionKeyValidatorInstalled = await checkIsSessionKeyExtensionInstalled(user.address)
                if (!isSessionKeyValidatorInstalled) {
                    // Install the SessionKeyValidator AND register session key
                    hash = await installSessionKeyExtension(user.address, accountSessionKey.address, targetContract)
                }
            } else {
                hash = await registerSessionKey(accountSessionKey.address, targetContract, user.address)
            }

            await publicClient.waitForTransactionReceipt({ hash: hash! })

            // Grant permissions for the app to use this session key
            grantPermissions(app, {
                [PermissionNames.SESSION_KEY]: {
                    target: targetContract,
                },
            })

            // Store the session key
            storage.set(StorageKey.SessionKeys, {
                ...storedSessionKeys,
                [user.address]: {
                    ...(storedSessionKeys[user.address] || {}),
                    [targetContract]: sessionKey,
                },
            })

            return accountSessionKey.address
        }

        default:
            return await sendToWalletClient(request)
    }
}

async function sendToWalletClient<T extends PopupMsgs[Msgs.PopupApprove]>(
    request: T,
): Promise<EIP1193RequestResult<T["payload"]["method"]>> {
    const client: Client | undefined = getWalletClient()
    if (!client) throw new EIP1193DisconnectedError()

    if (requestPayloadIsHappyMethod(request.payload)) {
        throw new EIP1193UnsupportedMethodError()
    }

    return await client.request(request.payload)
}
