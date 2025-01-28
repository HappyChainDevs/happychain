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
    zeroAddress,
} from "viem"
import type { UserOperation } from "viem/account-abstraction"
import { addPendingUserOp } from "#src/services/userOpsHistory"
import { deleteNonce, getNextNonce, setNonce } from "#src/state/nonces"
import { getPublicClient } from "#src/state/publicClient.js"
import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient"

export type UserOpSigner = (
    userOp: UnionPartialBy<UserOperation, "sender"> & { chainId?: number },
    smartAccountClient: ExtendedSmartAccountClient,
) => Promise<Hex>

export type SendUserOpArgs = {
    user: HappyUser
    tx: RpcTransactionRequest
    validator: Address
    signer: UserOpSigner
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

export async function sendUserOp({ user, tx, validator, signer }: SendUserOpArgs, retry = true) {
    const smartAccountClient = (await getSmartAccountClient())!
    const account = smartAccountClient.account.address
    const customNonce = await getNextNonce(account, validator)
    const isRoot = isRootValidator(validator)

    try {
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

        // For some reason, this gets estimated to 25k in some scenarios, but it needs to be 40k
        // to succeed for budget initialization (subsequent runs only need ~22k).
        preparedUserOp.paymasterVerificationGasLimit = 400000n

        if (isRoot && preparedUserOp.nonce > customNonce) {
            // Bundler nonce is fresher than our local nonce.
            setNonce(account, validator, preparedUserOp.nonce + 1n)
        } else {
            preparedUserOp.nonce = customNonce
        }

        const signature = await signer(preparedUserOp, smartAccountClient)

        const userOpWithSig = { ...preparedUserOp, signature }
        const userOpHash = await smartAccountClient.sendUserOperation(userOpWithSig)

        console.log("hash", userOpHash, toHex(preparedUserOp.nonce))

        void addPendingUserOp(user.address, {
            userOpHash: userOpHash as Hash,
            value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
        })

        return userOpHash
    } catch (error) {
        // TODO parse errors
        //      "AA33 reverted" is "paymaster validation reverted or out of gas"
        //      "AA25" is "invalid account nonce"
        //      https://docs.stackup.sh/docs/entrypoint-errors
        //      https://docs.pimlico.io/infra/bundler/entrypoint-errors
        if (error instanceof Error && retry && error.message.includes("AA25")) {
            deleteNonce(account, validator)
            return sendUserOp({ user, tx, validator, signer }, false)
        }
        throw error
    }
}

function isRootValidator(validatorAddress: Address) {
    return validatorAddress === contractAddresses.ECDSAValidator || validatorAddress === zeroAddress
}

/**
 * Returns the nonce from the EntryPoint-v7 contract for the given account and validator.
 */
export async function getNonce(smartAccountAddress: Address, validatorAddress: Address) {
    const isRoot = isRootValidator(validatorAddress)
    const validatorType = isRoot ? VALIDATOR_TYPE.ROOT : VALIDATOR_TYPE.VALIDATOR
    // This matches the behavior of the bundler when a nonce is not provided.
    // But in root mode, any key will work, include zero.
    const _validatorAddress = isRoot ? contractAddresses.ECDSAValidator : validatorAddress

    return await getAccountNonce(getPublicClient(), {
        address: smartAccountAddress,
        entryPointAddress: contractAddresses.EntryPointV7,
        key: BigInt(
            pad(
                concatHex([
                    VALIDATOR_MODE.DEFAULT,
                    validatorType,
                    _validatorAddress,
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
