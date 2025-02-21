import { HappyMethodNames, PermissionNames } from "@happy.tech/common"
import { deployment as contractAddresses } from "@happy.tech/contracts/account-abstraction/sepolia"
import {
    type ApprovedRequestExtraData,
    type ApprovedRequestPayload,
    EIP1193DisconnectedError,
    EIP1193ErrorCodes,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    type Msgs,
    type PopupMsgs,
    getEIP1193ErrorObjectFromCode,
    requestPayloadIsHappyMethod,
} from "@happy.tech/wallet-common"
import { type Client, InvalidAddressError, isAddress } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import {
    checkIsSessionKeyModuleInstalled,
    installSessionKeyModule,
    registerSessionKey,
} from "#src/requests/modules/session-keys/helpers"
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

    const { method: requestMethod, params: requestParams } = request.payload.eip1193RequestParams
    switch (requestMethod) {
        // This functionality is same as in injected.ts
        // TODO: refactor once we have a better plan on how to maintain separation while reducing
        // code duplication here
        case "eth_sendTransaction": {
            try {
                if (!user) throw new EIP1193UnauthorizedError()
                return await sendUserOp({
                    user,
                    tx: requestParams[0],
                    validator: contractAddresses.ECDSAValidator,
                    preparedOp: request.payload.extraData as ApprovedRequestExtraData<typeof requestMethod>,
                    signer: async (userOp, smartAccountClient) =>
                        await smartAccountClient.account.signUserOperation(userOp),
                })
            } catch (error) {
                console.error(error)
                throw error
            }
        }

        case "eth_requestAccounts": {
            if (!user) return []
            grantPermissions(app, "eth_accounts")
            return [user.address]
        }

        case "wallet_requestPermissions":
            return grantPermissions(app, requestParams[0])

        case "wallet_addEthereumChain": {
            const chains = getChains()
            const params = Array.isArray(requestParams) && requestParams[0]
            const isValid = isAddChainParams(params)

            if (!isValid)
                throw getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.SwitchChainError, "Invalid request body")

            if (params.chainId in chains)
                throw getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.SwitchChainError, "Chain already exists")

            const response = await sendToWalletClient({
                ...request,
                eip1193RequestParams: request.payload.eip1193RequestParams,
            })
            // Only add chain if the request is successful.
            setChains((prev) => ({ ...prev, [params.chainId]: params }))
            return response
        }

        case "wallet_switchEthereumChain": {
            const chains = getChains()
            const chainId = requestParams[0].chainId

            // ensure chain has already been added
            if (!(chainId in chains)) {
                throw getEIP1193ErrorObjectFromCode(
                    EIP1193ErrorCodes.SwitchChainError,
                    "Unrecognized chain ID, try adding the chain first.",
                )
            }

            if (chainId === getCurrentChain()?.chainId) return null // correct response for a successful request

            const response = await sendToWalletClient({
                ...request,
                eip1193RequestParams: request.payload.eip1193RequestParams,
            })
            // Currently this fails: web3Auth is hardcoded to the default initial chain.
            setCurrentChain(chains[chainId])
            return response
        }

        case "wallet_watchAsset": {
            return user ? addWatchedAsset(user.address, requestParams) : false
        }

        case HappyMethodNames.LOAD_ABI: {
            return user ? loadAbiForUser(user.address, requestParams) : false
        }

        case HappyMethodNames.REQUEST_SESSION_KEY: {
            // address of contract the session key will be authorized to interact with
            const targetContract = requestParams[0]

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
            return await sendToWalletClient(request.payload)
    }
}

async function sendToWalletClient<T extends PopupMsgs[Msgs.PopupApprove]["payload"]>(
    request: T,
): Promise<ApprovedRequestPayload<T["eip1193RequestParams"]["method"]>> {
    const client: Client | undefined = getWalletClient()
    if (!client) throw new EIP1193DisconnectedError()

    if (requestPayloadIsHappyMethod(request.eip1193RequestParams)) {
        throw new EIP1193UnsupportedMethodError()
    }

    return await client.request(request.eip1193RequestParams)
}
