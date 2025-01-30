import { deployment as contractAddresses } from "@happychain/contracts/account-abstraction/sepolia"
import type { HappyUser } from "@happychain/sdk-shared"
import { deepHexlify } from "permissionless"
import { getAccountNonce } from "permissionless/actions"
import {
    type Address,
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
import {
    type PrepareUserOperationParameters,
    type UserOperation,
    type UserOperationReceipt,
    getUserOperationHash,
} from "viem/account-abstraction"
import { addPendingUserOp, markUserOpAsConfirmed } from "#src/services/userOpsHistory"
import { getCurrentChain } from "#src/state/chains"
import { deleteNonce, getNextNonce } from "#src/state/nonces"
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

export async function sendUserOp({ user, tx, validator, signer }: SendUserOpArgs, retry = 2) {
    const smartAccountClient = (await getSmartAccountClient())!
    const account = smartAccountClient.account.address

    try {
        // We need the separate nonce lookup because:
        // - we do local nonce management to be able to have multiple userOps in flight
        // - prepareUserOperation cannot request nonces for custom nonceKeys (needed for session keys)
        const [nonce, _preparedUserOp] = await Promise.all([
            getNextNonce(account, validator),
            smartAccountClient.prepareUserOperation({
                account: smartAccountClient.account,
                paymaster: contractAddresses.HappyPaymaster,
                // Specify this array to avoid fetching the nonce from here too.
                // We don't really need the dummy signature, but it does not incur an extra network
                // call and it makes the type system happy.
                parameters: ["factory", "fees", "gas", "signature"],
                calls: [
                    {
                        to: tx.to,
                        data: tx.data,
                        value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
                    },
                ],
            } satisfies PrepareUserOperationParameters), // TS too dumb without this
        ])

        // sendUserOperationNow does not want account included
        const { account: _, ...preparedUserOp } = { ..._preparedUserOp, nonce }
        preparedUserOp.signature = await signer(preparedUserOp, smartAccountClient)

        const userOpHash = getUserOperationHash({
            chainId: Number(getCurrentChain().chainId),
            entryPointAddress: contractAddresses.EntryPointV7,
            entryPointVersion: "0.7",
            userOperation: preparedUserOp,
        })

        const pendingUserOpDetails = {
            userOpHash,
            value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
        }

        addPendingUserOp(user.address, pendingUserOpDetails)

        const userOpReceipt = (await smartAccountClient.request(
            {
                // @ts-ignore - the pimlico namespace is not supported by the Viem Smart Wallet types
                method: "pimlico_sendUserOperationNow",
                params: [deepHexlify(preparedUserOp), contractAddresses.EntryPointV7],
            },
            {
                // We'll handle retries at this level instead.
                retryCount: 0,
            },
        )) as UserOperationReceipt

        markUserOpAsConfirmed(user.address, pendingUserOpDetails, userOpReceipt)

        return userOpReceipt.userOpHash
    } catch (error) {
        // https://docs.stackup.sh/docs/entrypoint-errors
        // https://docs.pimlico.io/infra/bundler/entrypoint-errors

        if (
            error instanceof Error &&
            "details" in error &&
            typeof error.details === "string" &&
            error.details.startsWith("userOperation reverted during simulation with reason: AA25 invalid account nonce")
        ) {
            // Delete the nonce to force a refetch next time.
            deleteNonce(account, validator)
        }

        if (retry > 0) return sendUserOp({ user, tx, validator, signer }, retry - 1)
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
