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
    decodeAbiParameters,
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

export type NonceProvider = (smartAccountClient: ExtendedSmartAccountClient) => Promise<bigint | undefined>

export type SendUserOpArgs = {
    user: HappyUser
    tx: RpcTransactionRequest
    signer: UserOpSigner
    nonceProvider?: NonceProvider
}

export type UserOpWrappedCall = {
    to: Address
    value: bigint
    calldata: Hex
}

export enum VALIDATOR_MODE {
    DEFAULT = "0x00",
    ENABLE = "0x01",
}

export enum VALIDATOR_TYPE {
    ROOT = "0x00",
    VALIDATOR = "0x01",
    PERMISSION = "0x02",
}

export async function sendUserOp({ user, tx, signer, nonceProvider = async () => undefined }: SendUserOpArgs) {
    const smartAccountClient = (await getSmartAccountClient())!
    const customNonce = await nonceProvider(smartAccountClient)
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

/**
 * Returns the nonce from the EntryPoint-v7 contract for the given account and validator.
 */
export async function getNonce(smartAccountAddress: Address, validatorAddress: Address) {
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

export function parseUserOpCalldata(callData: Hex): UserOpWrappedCall {
    /**
     * UserOperations have 2 nested layers of data that we need to decode :
     *
     * 1. First layer (execute function) :
     *    The outer wrapper is a call to the `execute()` function (selector: `0xe9ae5c53`)
     *    We decode this to get :
     *    - `execMode`: how to execute the wrapped call
     *    - `executionCalldata`: parameters for the wrapped call
     *
     * 2. Second layer (target call) :
     *    Inside `executionCalldata`, we find the information of the wrapped call:
     *    (address target, uint256 value, bytes calldata callData)
     *
     * @see {@link https://docs.stackup.sh/docs/useroperation-calldata} for additional explanation
     * @see {@link https://eips.ethereum.org/EIPS/eip-4337#definitions} for the EIP-4337 specification
     */

    // 1. Decode the `execute()` function parameters
    const [, executionCalldata] = decodeAbiParameters(
        [
            { type: "bytes32", name: "execMode" },
            { type: "bytes", name: "executionCalldata" },
        ],
        `0x${callData.slice(10)}`, // Skip execute selector (0xe9ae5c53)
    )

    // 2. Decode the destination
    return {
        to: executionCalldata.slice(0, 40) as `0x${string}`,
        value: hexToBigInt(`0x${executionCalldata.slice(40, 72)}`),
        calldata: `0x${executionCalldata.slice(72)}`,
    }
}
