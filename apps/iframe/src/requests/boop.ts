import { computeBoopHash } from "@happy.tech/submitter-client"
import type { HappyUser } from "@happy.tech/wallet-common"
import type { Address, Hash, RpcTransactionRequest } from "viem"
import { addPendingBoop, markBoopAsConfirmed, markBoopAsFailed } from "#src/services/boopsHistory"
import { getBoopClient } from "#src/state/boopClient"

// @todo - cleanup imports
import type { HappyTx } from "../../../../packages/submitter/lib/tmp/interface/HappyTx"

export type BoopSigner = (boop: HappyTx) => Promise<HappyTx>

export type SendBoopArgs = {
    user: HappyUser
    tx: RpcTransactionRequest
    signer: BoopSigner
}

/**
 * Sends a Boop transaction through the submitter
 */
export async function sendBoop({ user, tx, signer }: SendBoopArgs, retry = 2): Promise<Hash> {
    const boopClient = await getBoopClient()
    if (!boopClient) throw new Error("Boop client not initialized")

    let boopHash: Hash | undefined = undefined

    try {
        const boop = await boopClient.boop.prepareTransaction({
            dest: tx.to as Address,
            callData: tx.data || "0x",
            value: tx.value ? BigInt(tx.value as string) : 0n,
        })

        const signedBoop = await signer(boop)
        boopHash = computeBoopHash(signedBoop) as Hash

        const pendingBoopDetails = {
            boopHash,
            value: tx.value ? BigInt(tx.value as string) : 0n,
        }
        addPendingBoop(user.address, pendingBoopDetails)

        const result = await boopClient.boop.execute(signedBoop)

        if (result.isErr()) {
            throw result.error
        }

        markBoopAsConfirmed(user.address, pendingBoopDetails.value, result.value)

        return boopHash
    } catch (error) {
        console.error("Error sending Boop:", error)

        if (retry > 0) {
            console.log(`Retrying Boop submission (${retry} attempts left)...`)
            return sendBoop({ user, tx, signer }, retry - 1)
        }

        if (boopHash) {
            markBoopAsFailed(user.address, {
                value: tx.value ? BigInt(tx.value as string) : 0n,
                boopHash,
            })
        }

        throw error
    }
}