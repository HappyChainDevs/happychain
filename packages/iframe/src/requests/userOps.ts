import type { HappyUser } from "@happychain/sdk-shared"
import { type Hash, type Hex, type RpcTransactionRequest, hexToBigInt } from "viem"
import { addPendingUserOp } from "#src/services/userOpsHistory"
import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient"

// TODO give this a proper type, based on actual returned results from Viem
export type UserOpSigner = (userOp: unknown, smartAccountClient: ExtendedSmartAccountClient) => Promise<Hex>

export async function sendUserOp(user: HappyUser, tx: RpcTransactionRequest, signer: UserOpSigner) {
    // TODO This try statement should go away, it's only here to surface errors
    //      that occured in the old convertToUserOp call and were being swallowed.
    //      We need to make sure all errors are correctly surfaced!
    try {
        const smartAccountClient = (await getSmartAccountClient())!
        const preparedUserOp = await smartAccountClient.prepareUserOperation({
            account: smartAccountClient.account,
            calls: [
                {
                    to: tx.to,
                    data: tx.data,
                    value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
                },
            ],
        })

        const signature = await signer(preparedUserOp, smartAccountClient)
        const userOpWithSig = { ...preparedUserOp, signature }
        const userOpHash = await smartAccountClient.sendUserOperation(userOpWithSig)

        addPendingUserOp(user.address, {
            userOpHash: userOpHash as Hash,
            value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
        })
        return userOpHash
    } catch (error) {
        console.error("Sending UserOp errored", error)
        throw error
    }
}
