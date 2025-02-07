import { writeContract } from "viem/actions"
import { HAPPY_ENTRYPOINT_ABI } from "#src/tmp/abis"
import type { HappyTxState } from "#src/tmp/interface/HappyTxState"
import { TransactionTypeName } from "#src/tmp/interface/common_chain"
import { EntryPointStatus } from "#src/tmp/interface/status"
import type { ExecuteInput } from "#src/tmp/interface/submitter_execute"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import type { BasicClient } from "../types"

// TODO: this should be in submitter_execute.ts ?
// https://github.com/HappyChainDevs/happychain/pull/418/files#r1947013603
export type ExecuteOutput = HappyTxState

export async function submitterExecute(
    client: BasicClient,
    // TODO: default to our entrypoint (defined in contracts)
    { entryPoint = "0x0000000000000000000000000000000000000000", tx }: ExecuteInput,
): Promise<ExecuteOutput> {
    // TODO: nonce management, buffer, etc etc etc
    const _hash = await writeContract(client, {
        address: entryPoint,
        args: [encodeHappyTx(tx)],
        functionName: "submit",
        abi: HAPPY_ENTRYPOINT_ABI,
    })

    // TODO: all values below are arbitrary
    return DUMMY_RESPONSE
}

const DUMMY_RESPONSE = {
    status: EntryPointStatus.Success,
    included: false,
    receipt: {
        happyTxHash: "0x",
        account: "0x",
        nonce: 1,
        entryPoint: "0x",
        status: EntryPointStatus.Success,
        logs: [],
        revertData: "0x",
        failureReason: "0x",
        gasUsed: 0n,
        gasCost: 0n,
        txReceipt: {
            blobGasPrice: undefined,
            blobGasUsed: undefined,
            blockHash: "0x",
            blockNumber: 0n,
            contractAddress: null,
            cumulativeGasUsed: 0n,
            effectiveGasPrice: 0n,
            from: "0x",
            gasUsed: 0n,
            logs: [],
            logsBloom: "0x",
            root: undefined,
            status: "success",
            to: null,
            transactionHash: "0x",
            transactionIndex: 0,
            type: TransactionTypeName.EIP1559,
        },
    },
} as const
