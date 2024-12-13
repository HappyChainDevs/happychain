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
import { type Client, type Hex, hexToBigInt } from "viem"
import { addPendingTx } from "#src/services/transactionHistory"
import { getChains, setChains } from "#src/state/chains"
import { getCurrentChain, setCurrentChain } from "#src/state/chains"
import { loadAbiForUser } from "#src/state/loadedAbis"
import { grantPermissions } from "#src/state/permissions"
import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient"
import type { PendingTxDetails } from "#src/state/txHistory"
import { getUser } from "#src/state/user"
import { getWalletClient } from "#src/state/walletClient"
import { addWatchedAsset } from "#src/state/watchedAssets"
import { isAddChainParams } from "#src/utils/isAddChainParam"
import { sendResponse } from "./sendResponse"
import { appForSourceID, convertTxToUserOp } from "./utils"

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
    const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient

    if (!user) {
        console.warn("Request approved, but no user found")
    }

    switch (request.payload.method) {
        case "eth_sendTransaction": {
            if (!user) return false

            const tx = request.payload.params[0]
            const partialUserOp = await convertTxToUserOp(
                {
                    to: tx.to as `0x${string}`,
                    data: tx.data || "0x",
                    value: tx.value ? hexToBigInt(tx.value) : 0n,
                },
                smartAccountClient.account.address,
            )
            const preparedUserOp = await smartAccountClient.prepareUserOperation({
                account: smartAccountClient.account,
                calls: [
                    {
                        ...partialUserOp,
                        // Optional gas parameters from the transaction
                        ...(tx.gas && {
                            callGasLimit: BigInt(tx.gas),
                        }),
                        ...(tx.maxFeePerGas && {
                            maxFeePerGas: BigInt(tx.maxFeePerGas),
                        }),
                        ...(tx.maxPriorityFeePerGas && {
                            maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas),
                        }),
                    },
                ],
            })

            const userOpHash = await smartAccountClient.sendUserOperation(preparedUserOp)
            const userOpReceipt = await smartAccountClient.waitForUserOperationReceipt({
                hash: userOpHash,
            })

            const hash = userOpReceipt.receipt.transactionHash

            // Track pending transaction with actual transaction hash
            const value = hexToBigInt(tx.value as Hex)
            const payload: PendingTxDetails = { hash, value }
            addPendingTx(user.address, payload)

            return hash
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
