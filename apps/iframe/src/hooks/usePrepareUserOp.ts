import { deployment as contractAddresses } from "@happy.tech/contracts/account-abstraction/sepolia"
import { waitForCondition } from "@happy.tech/wallet-common"
import { useMutation } from "@tanstack/react-query"
import { type Address, type Hex, type RpcTransactionRequest, hexToBigInt } from "viem"
import type { PrepareUserOperationParameters, PrepareUserOperationReturnType } from "viem/account-abstraction"
import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient.ts"

/**
 * Custom hook that utilizes a mutation to prepare a user operation for a smart account transaction.
 * It waits for the smart account client to be initialized, then prepares the user operation
 * with specified parameters and calls. Throws an error if the smart account client is not initialized
 * or if the user operation preparation fails.
 */
export function usePrepareUserOp() {
    const mutationPrepareUserOp = useMutation({
        mutationFn: async (tx: RpcTransactionRequest) => {
            await waitForCondition(async () => {
                return await getSmartAccountClient()
            })

            const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient
            if (!smartAccountClient) throw new Error("Smart account client not initialized")

            const userOp = await smartAccountClient.prepareUserOperation({
                account: smartAccountClient.account,
                paymaster: contractAddresses.HappyPaymaster as Address,
                parameters: ["factory", "fees", "gas", "signature"],
                calls: [
                    {
                        to: tx.to,
                        data: tx.data,
                        value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
                    },
                ],
                nonce: 0n,
                authorization: undefined,
            } satisfies PrepareUserOperationParameters)

            if (!userOp) throw new Error("Failed to prepare User Operation")

            return userOp as PrepareUserOperationReturnType
        },
    })

    return mutationPrepareUserOp
}
