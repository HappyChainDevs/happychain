import { HappyMethodNames } from "@happychain/common"
import { PermissionNames } from "@happychain/common"
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
} from "@happychain/sdk-shared"
import { type Client, InvalidAddressError, isAddress } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import {
    checkIsSessionKeyModuleInstalled,
    installSessionKeyModule,
    registerSessionKey,
} from "#src/requests/session-keys/helpers"
import { sendUserOp } from "#src/requests/userOps"
import { StorageKey, storage } from "#src/services/storage"
import { getChains, setChains } from "#src/state/chains"
import { getCurrentChain, setCurrentChain } from "#src/state/chains"
import { loadAbiForUser } from "#src/state/loadedAbis"
import { grantPermissions } from "#src/state/permissions"
import { getSmartAccountClient } from "#src/state/smartAccountClient"
import { getUser } from "#src/state/user"
import { getWalletClient } from "#src/state/walletClient"
import { addWatchedAsset } from "#src/state/watchedAssets"
import { isAddChainParams } from "#src/utils/isAddChainParam"
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
            if (!user) throw new EIP1193UnauthorizedError()
            return await sendUserOp(
                user,
                request.payload.params[0],
                async (userOp, smartAccountClient) => await smartAccountClient.account.signUserOperation(userOp),
            )
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

        case HappyMethodNames.USE_ABI: {
            return user ? loadAbiForUser(user.address, request.payload.params) : false
        }

        case HappyMethodNames.REQUEST_SESSION_KEY: {
            // address of contract the session key will be authorized to interact with
            const targetContract = request.payload.params[0]

            if (!isAddress(targetContract)) {
                throw new InvalidAddressError({ address: targetContract })
            }

            // Generate a new session key
            const sessionKey = generatePrivateKey()
            const accountSessionKey = privateKeyToAccount(sessionKey)

            // Check if we have any session keys stored for this account
            const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}
            const hasExistingSessionKeys = Boolean(storedSessionKeys[user!.address])

            const smartAccountClient = (await getSmartAccountClient())!
            let keyRegistered = false

            // Only check module installation if we don't have any session keys stored
            if (!hasExistingSessionKeys) {
                const isSessionKeyValidatorInstalled = await checkIsSessionKeyModuleInstalled(smartAccountClient)
                if (!isSessionKeyValidatorInstalled) {
                    await installSessionKeyModule(smartAccountClient, accountSessionKey.address, targetContract)
                    keyRegistered = true
                }
            }

            // It's theoreticaly possible to have the validator uninstalled when there are local
            // session keys, but if you're doing that you're looking for trouble.

            if (!keyRegistered) {
                const hash = await registerSessionKey(smartAccountClient, accountSessionKey.address, targetContract)
                await smartAccountClient.waitForUserOperationReceipt({ hash })
                keyRegistered = true
            }

            grantPermissions(app, {
                [PermissionNames.SESSION_KEY]: {
                    target: targetContract,
                },
            })

            storage.set(StorageKey.SessionKeys, {
                ...storedSessionKeys,
                [user!.address]: {
                    ...(storedSessionKeys[user!.address] || {}),
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
