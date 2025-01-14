import { HappyMethodNames } from "@happychain/common"
import {
    EIP1193DisconnectedError,
    EIP1193ErrorCodes,
    type EIP1193RequestResult,
    EIP1193UnsupportedMethodError,
    type Msgs,
    type PopupMsgs,
    getEIP1193ErrorObjectFromCode,
    requestPayloadIsHappyMethod,
} from "@happychain/sdk-shared"
import { type Client, type Hash, type Hex, hexToBigInt } from "viem"
import { addPendingUserOp } from "#src/services/userOpsHistory.ts"
import { getChains, setChains } from "#src/state/chains"
import { getCurrentChain, setCurrentChain } from "#src/state/chains"
import { loadAbiForUser } from "#src/state/loadedAbis"
import { grantPermissions } from "#src/state/permissions"
import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient"
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
export function handleApprovedRequest(request: PopupMsgs[Msgs.PopupApprove]): void {
    void sendResponse(request, dispatchHandlers)
}

// exported for testing
export async function dispatchHandlers(request: PopupMsgs[Msgs.PopupApprove]) {
    const app = appForSourceID(request.windowId)! // checked in sendResponse

    const user = getUser()
    const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient

    if (!user) {
        console.warn("Request approved, but no user found")
    }

    switch (request.payload.method) {
        case "eth_sendTransaction": {
            if (!user) return false

            // TODO This try statement should go away, it's only here to surface errors
            //      that occured in the old convertToUserOp call and were being swallowed.
            //      We need to make sure all errors are correctly surfaced!
            try {
                console.log("eth_sendTransaction request:", request)
                const tx = request.payload.params[0]
                const preparedUserOp = await smartAccountClient.prepareUserOperation({
                    account: smartAccountClient.account,
                    calls: [{
                        to: tx.to,
                        data: tx.data,
                        value: tx.value? hexToBigInt(tx.value as Hex) :0n,
                      }
                    ]
                })
                console.log("preparedUserOp:", preparedUserOp)
                // strip signature field from preparedUserOp
                const { signature, ...updatedUserOp } = preparedUserOp;
                // const userOpHash = await smartAccountClient.sendUserOperation(updatedUserOp)

                // sign with SmartAccountClient
                const client = await getSmartAccountClient() as any
                console.log("client:", client.account)
                const _signature = await client.account.signUserOperation(updatedUserOp)
                console.log("signature:", _signature)   
                // console.log(client.signUserOperation(preparedUserOp))  

                const userOpWithSig = {...updatedUserOp, signature: _signature}
                const userOpHash = await smartAccountClient.sendUserOperation(userOpWithSig)
                
                
                
                console.log("userOpHash:", userOpHash)
                addPendingUserOp(user.address, {
                    userOpHash: userOpHash as Hash,
                    value: tx.value? hexToBigInt(tx.value as Hex) :0n,
                })

                return userOpHash
            } catch (error) {
                console.error("Sending UserOp errored", error)
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

        case HappyMethodNames.WALLET_USE_ABI_RPC_METHOD: {
            return user ? loadAbiForUser(user.address, request.payload.params) : false
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
