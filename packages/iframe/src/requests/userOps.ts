import { deployment as contractAddresses } from "@happychain/contracts/account-abstraction/sepolia"
import type { HappyUser } from "@happychain/sdk-shared"
import { getAccountNonce } from "permissionless/actions"
import {
    type Address,
    type Hash,
    type Hex,
    type RpcTransactionRequest,
    type UnionPartialBy,
    concatHex,
    hexToBigInt,
    pad,
    toHex,
} from "viem"
import type { UserOperation } from "viem/account-abstraction"
import { addPendingUserOp } from "#src/services/userOpsHistory"
import { getPublicClient } from "#src/state/publicClient.js"
import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient"

export type UserOpSigner = (
    userOp: UnionPartialBy<UserOperation, "sender"> & { chainId?: number },
    smartAccountClient: ExtendedSmartAccountClient,
) => Promise<Hex>

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
 * Returns the nonce from the EntryPoint-v7 contract for the smart account.
 */
async function getCustomNonce(smartAccountAddress: Address, validatorAddress: Address) {
    return await getAccountNonce(getPublicClient(), {
        address: smartAccountAddress,
        entryPointAddress: contractAddresses.EntryPointV7,
        key: BigInt(
            pad(
                concatHex([
                    VALIDATOR_MODE.DEFAULT,
                    VALIDATOR_TYPE.VALIDATOR,
                    validatorAddress,
                    toHex(
                        0n, // Internal key to the Kernel smart account (unused for the root validator module)
                        { size: 2 },
                    ),
                ]),
                {
                    size: 24,
                },
            ),
        ),
    })
}

export async function sendUserOp(user: HappyUser, tx: RpcTransactionRequest, signer: UserOpSigner) {
    const smartAccountClient = (await getSmartAccountClient())!
    const customNonce = await getCustomNonce(smartAccountClient.account.address, contractAddresses.SessionKeyValidator)
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

    const userOpWithSig = { ...preparedUserOp, signature }
    const userOpHash = await smartAccountClient.sendUserOperation(userOpWithSig)

    void addPendingUserOp(user.address, {
        userOpHash: userOpHash as Hash,
        value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
    })

    return userOpHash
}
