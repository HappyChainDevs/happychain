import { deployment as contractAddresses } from "@happychain/contracts/account-abstraction/sepolia"
import type { HappyUser } from "@happychain/sdk-shared"
import { getAccountNonce } from "permissionless/actions"
import { type Address, type Hash, type Hex, type RpcTransactionRequest, concatHex, hexToBigInt, pad, toHex } from "viem"
import type { UserOperation } from "viem/account-abstraction"
import { addPendingUserOp } from "#src/services/userOpsHistory"
import { getPublicClient } from "#src/state/publicClient.js"
import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient"

// TODO give this a proper type, based on actual returned results from Viem
// EDIT updated with UserOperation
export type UserOpSigner = (userOp: UserOperation, smartAccountClient: ExtendedSmartAccountClient) => Promise<Hex>

// TODO move to sdk-shared
export enum VALIDATOR_MODE {
    DEFAULT = "0x00",
    ENABLE = "0x01",
}

export enum VALIDATOR_TYPE {
    ROOT = "0x00",
    VALIDATOR = "0x01",
    PERMISSION = "0x02",
}

/**
 * Returns the nonce from the EntryPoint-v7 contract
 * for the smart account.
 */
async function getCustomNonce(smartAccountAddress: Address, validatorAddress: Address) {
    const encoding = pad(
        concatHex([VALIDATOR_MODE.DEFAULT, VALIDATOR_TYPE.VALIDATOR, validatorAddress, toHex(0n, { size: 2 })]),
        { size: 24 },
    )

    const nonceKeyWithEncoding = BigInt(encoding)

    return await getAccountNonce(getPublicClient(), {
        address: smartAccountAddress,
        entryPointAddress: contractAddresses.EntryPointV7,
        key: nonceKeyWithEncoding,
    })
}

export async function sendUserOp(user: HappyUser, tx: RpcTransactionRequest, signer: UserOpSigner) {
    // TODO This try statement should go away, it's only here to surface errors
    //      that occured in the old convertToUserOp call and were being swallowed.
    //      We need to make sure all errors are correctly surfaced!
    try {
        const smartAccountClient = (await getSmartAccountClient())!
        const customNonce = await getCustomNonce(
            smartAccountClient.account.address,
            contractAddresses.SessionKeyValidator,
        )
        const preparedUserOp = await smartAccountClient.prepareUserOperation({
            account: smartAccountClient.account,
            calls: [
                {
                    to: tx.to,
                    data: tx.data,
                    value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
                },
            ],
            nonce: customNonce,
        })

        const signature = await signer(preparedUserOp, smartAccountClient)

        if (signature) {
            const userOpWithSig = { ...preparedUserOp, signature }
            const userOpHash = await smartAccountClient.sendUserOperation(userOpWithSig)

            void addPendingUserOp(user.address, {
                userOpHash: userOpHash as Hash,
                value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
            })

            return userOpHash
        }
    } catch (error) {
        console.error("Sending UserOp errored", error)
        throw error
    }
}
