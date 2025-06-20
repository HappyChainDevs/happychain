import type { BoopLog } from "@happy.tech/boop-sdk"
import { parseBigInt } from "@happy.tech/common"
import { type Address, erc20Abi, keccak256, stringToHex } from "viem"
import { useReadContracts } from "wagmi"
import type { HistoryEntry } from "#src/state/boopHistory"
import { miscLogger } from "#src/utils/logger"

export enum OperationType {
    NativeTransfer = "native-transfer",
    ERC20Transfer = "erc20-transfer",
    ContractInteraction = "contract-interaction",
    SessionKeyAdded = "session-key-added",
    SessionKeyRemoved = "session-key-removed",
    Failed = "failed",
}

type ActivityDetails =
    | {
          type: Exclude<OperationType, OperationType.ERC20Transfer>
          details?: undefined
      }
    | {
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

const EVENT_SIGNATURES = {
    ERC20_TRANSFER: keccak256(stringToHex("Transfer(address,address,uint256)")),
    SESSION_KEY_ADDED: keccak256(stringToHex("SessionKeyAdded(address,address,address)")),
    SESSION_KEY_REMOVED: keccak256(stringToHex("SessionKeyRemoved(address,address)")),
} as const

function getOperationType(entry: HistoryEntry): OperationType {
    if (entry.error !== undefined) return OperationType.Failed
    // NOTE: We can only perform this classification after a boop succeeds for now,
    // they will show as either NativeTransfer or ContractInteraction while pending.
    for (const log of entry.receipt?.logs ?? []) {
        switch (log.topics[0]?.toLowerCase()) {
            case EVENT_SIGNATURES.ERC20_TRANSFER:
                return OperationType.ERC20Transfer
            case EVENT_SIGNATURES.SESSION_KEY_ADDED:
                return OperationType.SessionKeyAdded
            case EVENT_SIGNATURES.SESSION_KEY_REMOVED:
                return OperationType.SessionKeyRemoved
        }
    }
    if (entry.value > 0n) return OperationType.NativeTransfer
    return OperationType.ContractInteraction
}

export function useClassifyActivity(entry: HistoryEntry): ActivityDetails {
    const type = getOperationType(entry)
    return { type }
}

// TODO parse ERC20 logs and enable the full version of this
export function _useClassifyActivity(entry: HistoryEntry): ActivityDetails {
    const type = getOperationType(entry)

    // TODO No guarantee that the target contract is the one that initiated an ERC20 transfer.
    //      Honestly the entire classification logic does not belong in React at all — the
    //      result here will never change, and so it should be computed once and saved.
    const isErc20 = type === OperationType.ERC20Transfer
    const abi = erc20Abi
    const address = entry.receipt?.boop?.dest
    // biome-ignore format: terse
    const { data: tokenDetails } = useReadContracts({
        contracts: [ { abi, address, functionName: "symbol" }, { abi, address, functionName: "decimals" } ],
        query: { enabled: isErc20 },
    })

    if (!isErc20 || !entry.receipt?.boop || !tokenDetails || tokenDetails[0].error || tokenDetails[1].error)
        return { type }

    const _details = entry.receipt.logs
        .map((log) => decodeERC20TransferLog(log))
        .filter((d) => !!d)
        // TODO multiple ERC20 transfers can come from different contracts
        .map((details) => ({ ...details, symbol: tokenDetails[0].result, decimals: tokenDetails[1].result }))

    return { type }
    // TODO the below would work if we make `details` an array, but question of how to display this info in the UX
    // return { type, details }
}

function decodeERC20TransferLog(log: BoopLog) {
    if (log.topics[0] !== EVENT_SIGNATURES.ERC20_TRANSFER) return
    try {
        // Signature is: Transfer(sender: address, to: address, amount: uin256)
        // 26 = 2 for 0x + 12 bytes of padding
        const from = `0x${log.topics[1]?.slice(26)}` satisfies Address
        const to = `0x${log?.topics[2]?.slice(26)}` satisfies Address
        const amount = parseBigInt(`0x${log?.topics[3]}`)
        if (!from || !to || !amount) return
        return { address: log.address, from, to, amount }
    } catch {
        miscLogger.info("Failed to decode ERC20 transfer log", log)
    }
}
