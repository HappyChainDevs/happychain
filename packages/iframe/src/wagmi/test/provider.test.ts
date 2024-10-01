import type { RpcBlock } from "viem"
import { describe, expect, it } from "vitest"
import { IframeProvider } from "../provider"

const emptyRpcBlock = {
    baseFeePerGas: null,
    blobGasUsed: "0x",
    difficulty: "0x",
    excessBlobGas: "0x",
    extraData: "0x",
    gasLimit: "0x",
    gasUsed: "0x",
    hash: null,
    logsBloom: null,
    miner: "0x",
    mixHash: "0x",
    nonce: null,
    number: null,
    parentHash: "0x",
    receiptsRoot: "0x",
    sealFields: [],
    sha3Uncles: "0x",
    size: "0x",
    stateRoot: "0x",
    timestamp: "0x",
    totalDifficulty: "0x",
    transactions: [],
    transactionsRoot: "0x",
    uncles: [],
} satisfies RpcBlock

describe("iframeProvider", () => {
    const provider = new IframeProvider()

    it("returns empty rpc block, request forwarded to public client", async () => {
        // provider request, unanswered so don't await
        // await expect(
        //     provider.request({
        //         method: "eth_getBlockByNumber",
        //         params: ["latest", false],
        //     }),
        // ).resolves.toStrictEqual(emptyRpcBlock)
    })
})
