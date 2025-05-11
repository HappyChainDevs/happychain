import { Onchain } from "@happy.tech/boop-sdk"
import { type Address, type Log, erc20Abi, isAddress, keccak256, stringToHex } from "viem"
import { useReadContracts } from "wagmi"
import { BoopStatus, type StoredBoop } from "#src/state/boopHistory"

export enum OperationType {
    NativeTransfer = "native-transfer",
    ERC20Transfer = "erc20-transfer",
    ContractInteraction = "contract-interaction",
    SessionKeyAdded = "session-key-added",
    SessionKeyRemoved = "session-key-removed",
    Failed = "failed",
}

interface BaseActivityDetails {
    type: OperationType
}

interface ERC20TransferDetails extends BaseActivityDetails {
    type: OperationType.ERC20Transfer
    details?: {
        address: Address
        to: Address
        from: Address
        amount: bigint
        symbol?: string
        decimals?: number
    }
}

interface NativeTransferDetails extends BaseActivityDetails {
    type: OperationType.NativeTransfer
    details?: undefined
}

interface SessionKeyDetails extends BaseActivityDetails {
    type: OperationType.SessionKeyAdded | OperationType.SessionKeyRemoved
    details?: undefined
}

interface ContractInteractionDetails extends BaseActivityDetails {
    type: OperationType.ContractInteraction
    details?: undefined
}

interface FailedDetails extends BaseActivityDetails {
    type: OperationType.Failed
    details?: undefined
}

type ActivityDetails =
    | ERC20TransferDetails
    | NativeTransferDetails
    | SessionKeyDetails
    | ContractInteractionDetails
    | FailedDetails

const EVENT_SIGNATURES = {
    ERC20_TRANSFER: keccak256(stringToHex("Transfer(address,address,uint256)")),
    SESSION_KEY_ADDED: keccak256(stringToHex("SessionKeyAdded(address,address,address)")),
    SESSION_KEY_REMOVED: keccak256(stringToHex("SessionKeyRemoved(address,address)")),
} as const

/**
 * Decodes an ERC20 Transfer event log into a structured format
 * NOTE: currently unused but could be used to display more info from ERC-20 transfers
 *
 * @param log - The event log to decode
 * @returns The decoded transfer information or null if decoding fails
 */
function _decodeERC20TransferLog(log: Log) {
    try {
        return {
            address: log.address,
            to: `0x${log?.topics?.[2]?.slice(26)}` as Address,
            from: `0x${log?.topics?.[1]?.slice(26)}` as Address,
            amount: BigInt(log.data),
        }
    } catch (e) {
        console.error("Failed to decode transfer log:", e)
        return undefined
    }
}

/**
 * Classifies a user operation based on its logs and properties
 * @param boop - The user operation to classify
 * @returns The classified activity details
 */
function classifyBoop(boop: StoredBoop): ActivityDetails {
    if (boop?.status !== BoopStatus.Success || boop.boopReceipt.status !== Onchain.Success)
        return { type: OperationType.Failed }
    const logs = boop.boopReceipt.receipt.logs

    for (const log of logs) {
        switch (log.topics[0]?.toLowerCase()) {
            case EVENT_SIGNATURES.ERC20_TRANSFER:
                return { type: OperationType.ERC20Transfer }
            case EVENT_SIGNATURES.SESSION_KEY_ADDED:
                return { type: OperationType.SessionKeyAdded }
            case EVENT_SIGNATURES.SESSION_KEY_REMOVED:
                return { type: OperationType.SessionKeyRemoved }
        }
    }

    if (boop.value > 0n) {
        return {
            type: OperationType.NativeTransfer,
        }
    }

    return {
        type: OperationType.ContractInteraction,
    }
}

/**
 * Classifies a boop and fetches additional ERC20 details if needed.
 * @param transaction - The user operation/transaction to classify
 * @returns Classified activity with token details (if applicable)
 */
export function useClassifyActivity(boop: StoredBoop): ActivityDetails {
    const activity = classifyBoop(boop)

    const { data: tokenDetails } = useReadContracts({
        contracts:
            activity.type === OperationType.ERC20Transfer
                ? [
                      {
                          abi: erc20Abi,
                          address: activity.details?.address,
                          functionName: "symbol",
                      },
                      {
                          abi: erc20Abi,
                          address: activity.details?.address,
                          functionName: "decimals",
                      },
                  ]
                : undefined,
        query: {
            enabled: activity.type === OperationType.ERC20Transfer && isAddress(activity.details?.address as string),
        },
    })

    if (activity.type === OperationType.ERC20Transfer && tokenDetails) {
        return {
            ...activity,
            details: {
                ...activity.details,
                symbol: tokenDetails[0].result as string,
                decimals: tokenDetails[1].result as number,
            },
        } as ERC20TransferDetails
    }

    return activity
}
