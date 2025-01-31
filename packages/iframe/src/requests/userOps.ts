import { HappyMap, Map2, Mutex, promiseWithResolvers, sleep } from "@happychain/common"
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
    type GetUserOperationReturnType,
    type PrepareUserOperationParameters,
    type UserOperation,
    type UserOperationReceipt,
    getUserOperationHash,
} from "viem/account-abstraction"
import { receiptCache } from "#src/requests/permissionless"
import { addPendingUserOp, markUserOpAsConfirmed } from "#src/services/userOpsHistory"
import { getCurrentChain } from "#src/state/chains"
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

    // [DEBUGLOG] // let debugNonce = 0n
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

        // [DEBUGLOG] // debugNonce = nonce

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

        // [DEBUGLOG] // console.log("sending", userOpHash, retry)
        const userOpReceipt = await submitUserOp(smartAccountClient, validator, preparedUserOp)

        receiptCache.put(userOpHash, [
            userOpReceipt,
            {
                blockHash: userOpReceipt.receipt.blockHash,
                blockNumber: userOpReceipt.receipt.blockNumber,
                entryPoint: contractAddresses.EntryPointV7,
                transactionHash: userOpHash,
                userOperation: preparedUserOp,
            } as GetUserOperationReturnType,
        ])

        // [DEBUGLOG] // console.log("receipt", userOpHash, retry)

        markUserOpAsConfirmed(user.address, pendingUserOpDetails, userOpReceipt)

        return userOpReceipt.userOpHash
    } catch (error) {
        // https://docs.stackup.sh/docs/entrypoint-errors
        // https://docs.pimlico.io/infra/bundler/entrypoint-errors

        // [DEBUGLOG] // console.log("error", nonceB, error.details || error, retry)

        // Most likely the transaction didn't land, so need to resynchronize the nonce.
        deleteNonce(account, validator)

        if (retry > 0) return sendUserOp({ user, tx, validator, signer }, retry - 1)
        throw error
    }
}

function isRootValidator(validatorAddress: Address) {
    return validatorAddress === contractAddresses.ECDSAValidator || validatorAddress === zeroAddress
}

const nonces = new Map2<Address, Address, bigint>()
const nonceMutexes = new Map2<Address, Address, Mutex>()

/**
 * Returns the next nonce for the given account and validator, using a local view of the nonce
 * if possible, and fetching the nonce from the chain otherwise.
 *
 * This function sits besides a per-(validator,address) mutex, which avoids two userOps from
 * simultaneously requesting the same nonce from the chain, resulting in a nonce clash.)
 */
async function getNextNonce(account: Address, validator: Address): Promise<bigint> {
    const mutex = nonceMutexes.getOrSet(account, validator, () => new Mutex())
    return mutex.locked(async () => {
        // [DEBUGLOG] //const oldNonce = nonces.get(account, validator)
        const nonce = await nonces.getOrSetAsync(account, validator, () => getOnchainNonce(account, validator))
        // [DEBUGLOG] // if (oldNonce === nonce) {
        // [DEBUGLOG] //     console.log("stored nonce", nonce)
        // [DEBUGLOG] // } else {
        // [DEBUGLOG] //     console.log("fetched nonce", nonce)
        // [DEBUGLOG] // }
        nonces.set(account, validator, nonce + 1n)
        return nonce
    })
}

/**
 * Deletes the local nonce information for a the given account and validator.
 */
function deleteNonce(account: Address, validator: Address) {
    nonces.delete(account, validator)
}

/**
 * Returns the nonce from the EntryPoint-v7 contract for the given account and validator.
 */
async function getOnchainNonce(smartAccountAddress: Address, validatorAddress: Address) {
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
                    // Inner Kernel-specific nonce key — enables parallel nonce tracks for given validator.
                    toHex(0n, { size: 2 }),
                ]),
                { size: 24 },
            ),
        ),
    })
}

type UserOpQueueEntry = {
    promise: Promise<UserOperationReceipt>
    resolve: (receipt: UserOperationReceipt) => void
    reject: (error: unknown) => void
    userOp: UserOperation
    // TODO: this and its dependencies should probably be constants, not atoms
    smartAccountClient: ExtendedSmartAccountClient
}

/** Last submitted nonce per validator. */
const lastNonces: HappyMap<Address, bigint> = new HappyMap()

/** Queued user operations awaiting submission per validator. */
const userOpQueues: HappyMap<Address, UserOpQueueEntry[]> = new HappyMap()

/**
 * Submits a userOp to the bundler, enforcing proper ordering of userOps by nonce, as well as
 * enforcing a ~200ms delay between successive userOp submissions.
 *
 * These constraints work around problems with the bundler which will reject userOps whose nonce
 * is higher than previously seen nonce, by maximizing the chance that the bundler sees nonces
 * in the proper order.
 */
async function submitUserOp(
    smartAccountClient: ExtendedSmartAccountClient,
    validator: Address,
    userOp: UserOperation,
): Promise<UserOperationReceipt> {
    // Ensure initialization
    await lastNonces.getOrSetAsync(validator, async () => {
        return (await getOnchainNonce(userOp.sender, validator)) - 1n
    })

    const queue = userOpQueues.getOrSet(validator, [])
    const { promise, resolve, reject } = promiseWithResolvers<UserOperationReceipt>()
    const entry = { promise, resolve, reject, userOp, smartAccountClient }

    if (queue.length === 0 && userOp.nonce === lastNonces.get(validator)! + 1n) {
        // Fast path: nothing in queue & next nonce, no need to wait for next interval to trigger.
        void requestSendUserOpNow(validator, entry)
        return await promise
    }

    queue.push(entry)
    queue.sort((a, b) => Number(a.userOp.nonce - b.userOp.nonce))

    // This accomodates for a burst of up to 10 userOps (submitted every 3s to account for the fact
    // the bundler cannot manage the nonces whatsoever). In practice, with this timeout, the
    // transaction can still succeed upon resubmit, but we avoid a fully "stuck" scenario where
    // nothing goes through at all because a transaction failed to include without erroring — note
    // that we haven't observed these scenarios in practice with `pimlico_sendUserOperationNow`.
    const receiptOrUndefined = await Promise.race([promise, sleep(30_000)])

    if (!receiptOrUndefined) {
        // Timeout: resync the nonce, and remove this userOp all those with higher nonces
        // from the queue.
        const deleted = userOpQueues.get(validator)!.splice(queue.indexOf(entry))
        deleted.slice(1).forEach((entry) => entry.reject(new Error("UserOp submission timeout")))
        lastNonces.set(validator, await getOnchainNonce(userOp.sender, validator))
        throw new Error("UserOp submission timeout (trigger userOp)")
    }

    return receiptOrUndefined
}

/**
 * Every 3s (accomodate for time-to-inclusion, as bundler can't manage nonces), attempt to submit
 * the next userOp in the queue for each validator. Resync the nonce if the submission fails.
 */
setInterval(() => {
    userOpQueues.entries().forEach(async ([validator, queue]) => {
        if (!queue || queue.length === 0) return
        const nextNonce = lastNonces.get(validator)! + 1n
        const nonce = queue[0].userOp.nonce
        // We allow lower nonce, as this can result from a resync.
        if (nonce > nextNonce) return
        const entry = queue.shift()!
        void requestSendUserOpNow(validator, entry)
    })
}, 3000)

/** Performs a low-level `pimlico_sendUserOperationNow` with no retries. */
async function requestSendUserOpNow(validator: Address, entry: UserOpQueueEntry) {
    // [DEBUGLOG] // console.log("now", entry.userOp.nonce)
    try {
        lastNonces.set(validator, entry.userOp.nonce)
        const userOpReceipt = (await entry.smartAccountClient.request(
            {
                // @ts-ignore - the pimlico namespace is not supported by the Viem Smart Wallet types
                method: "pimlico_sendUserOperationNow",
                params: [deepHexlify(entry.userOp), contractAddresses.EntryPointV7],
            },
            { retryCount: 0 }, // We handle retries at the `sendUserOp` level.
        )) satisfies UserOperationReceipt
        entry.resolve(userOpReceipt!)
    } catch (e) {
        // submission failed, resync nonce
        lastNonces.set(validator, await getOnchainNonce(entry.userOp.sender, validator))
        entry.reject(e)
    }
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
