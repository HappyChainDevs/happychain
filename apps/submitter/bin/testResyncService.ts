#!/usr/bin/env bun
import { type Hex, sleep } from "@happy.tech/common"
import { abis, deployment } from "@happy.tech/contracts/mocks/sepolia"
import {
    http,
    type Account,
    type WalletClient,
    createPublicClient,
    createWalletClient,
    encodeFunctionData,
    formatEther,
    parseGwei,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { happychainTestnet } from "viem/chains"
import { resyncAccount } from "#lib/services/resync"

// TODO — this script is a WIP!

/**
 * This script tests the {@link resyncAccount} function by:
 * 1. Connecting to the testnet.happy.tech RPC endpoint
 * 2. Sending a few transactions with carefully tuned fees to stay in the mempool:
 *    - maxFeePerGas just at the baseFee level (to be accepted by the node)
 *    - maxPriorityFeePerGas set to 0 (to avoid being immediately included)
 * 3. Starting the submitter and verifying the resync service cancels them
 */

const BLOCK_GAS_LIMIT = 30_000_000
const NUM_STUCK_TXS = 10
const TX_GAS_AMOUNT = 1_200_000n
const NUM_BLOCKS_TO_FILL = 20
const MONITOR_TIMEOUT = 60_000

const TXS_PER_BLOCK = Math.floor(BLOCK_GAS_LIMIT / Number(TX_GAS_AMOUNT))
const NUM_BLOCK_FILLING_TXS = TXS_PER_BLOCK * NUM_BLOCKS_TO_FILL

const RPC_HTTP_URL = process.env.RPC_HTTP_URLS?.split(",")[0] ?? "https://rpc.testnet.happy.tech/http"

const EXECUTOR_KEY = process.env.EXECUTOR_KEYS?.split(",")[0]
const BLOCK_FILLER_KEY = process.env.EXECUTOR_KEYS?.split(",")[1]
if (!EXECUTOR_KEY || !BLOCK_FILLER_KEY) {
    throw new Error("Executor keys not found in environment variables")
}

const executorAccount = privateKeyToAccount(EXECUTOR_KEY as Hex)
const blockFillerAccount = privateKeyToAccount(BLOCK_FILLER_KEY as Hex)

const executorWalletClient = createWalletClient({
    account: executorAccount,
    transport: http(RPC_HTTP_URL),
})

const blockFillerWalletClient = createWalletClient({
    account: blockFillerAccount,
    transport: http(RPC_HTTP_URL),
})

const publicClient = createPublicClient({
    transport: http(RPC_HTTP_URL),
})

async function prepareBurnGasTx({
    account,
    walletClient,
    gas,
    gasToBurn,
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce,
}: {
    account: Account
    walletClient: WalletClient
    gas: bigint
    gasToBurn: bigint
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
    nonce: number
}): Promise<Hex> {
    return walletClient.signTransaction(
        await walletClient.prepareTransactionRequest({
            account,
            chain: happychainTestnet,
            to: deployment.MockGasBurner,
            data: encodeFunctionData({
                abi: abis.MockGasBurner,
                functionName: "burnGas",
                args: [gasToBurn],
            }),
            nonce,
            gas,
            maxFeePerGas,
            maxPriorityFeePerGas,
        }),
    )
}

async function run(): Promise<void> {
    try {
        console.log("\n\x1b[1m\x1b[34m═════════ RESYNC SERVICE TEST ═════════\x1b[0m")

        const [executorBalance, fillerBalance] = await Promise.all([
            publicClient.getBalance({ address: executorAccount.address }),
            publicClient.getBalance({ address: blockFillerAccount.address }),
        ])

        console.log(`\nExecutor account: ${executorAccount.address}, balance: ${formatEther(executorBalance)} ETH`)
        console.log(`Block filler account: ${blockFillerAccount.address}, balance: ${formatEther(fillerBalance)} ETH`)

        if (executorBalance < parseGwei("5000") || fillerBalance < parseGwei("5000")) {
            console.error("\n\x1b[41m\x1b[37m INSUFFICIENT FUNDS \x1b[0m Please fund the accounts.")
            return
        }

        const block = await publicClient.getBlock()
        const baseFee = block.baseFeePerGas || parseGwei("1")

        const [executorLatestNonce, executorPendingNonce, fillerLatestNonce, fillerPendingNonce] = await Promise.all([
            publicClient.getTransactionCount({ address: executorAccount.address }),
            publicClient.getTransactionCount({ address: executorAccount.address, blockTag: "pending" }),
            publicClient.getTransactionCount({ address: blockFillerAccount.address }),
            publicClient.getTransactionCount({ address: blockFillerAccount.address, blockTag: "pending" }),
        ])

        console.log("\nCurrent network state:")
        console.log(`- Current block: ${block.number}, base fee: ${baseFee}`)
        console.log(`- Executor nonces: latest=${executorLatestNonce}, pending=${executorPendingNonce}`)
        console.log(`- Block filler nonces: latest=${fillerLatestNonce}, pending=${fillerPendingNonce}`)

        const stuckPriorityFee = 0n
        const fillerPriorityFee = baseFee

        console.log(`\nPreparing ${NUM_BLOCK_FILLING_TXS} block-filling and ${NUM_STUCK_TXS} stuck transactions...`)

        const blockFillerRawTxs = await Promise.all(
            Array.from({ length: NUM_BLOCK_FILLING_TXS }, (_, i) =>
                prepareBurnGasTx({
                    account: blockFillerAccount,
                    walletClient: blockFillerWalletClient,
                    gasToBurn: TX_GAS_AMOUNT,
                    gas: TX_GAS_AMOUNT + 42000n,
                    maxFeePerGas: baseFee * 3n,
                    maxPriorityFeePerGas: fillerPriorityFee,
                    nonce: fillerLatestNonce + i,
                }),
            ),
        )

        const stuckRawTxs = await Promise.all(
            Array.from({ length: NUM_STUCK_TXS }, (_, i) =>
                prepareBurnGasTx({
                    account: executorAccount,
                    walletClient: executorWalletClient,
                    gasToBurn: TX_GAS_AMOUNT,
                    gas: TX_GAS_AMOUNT + 42000n,
                    maxFeePerGas: baseFee + baseFee / 2n,
                    maxPriorityFeePerGas: stuckPriorityFee,
                    nonce: executorLatestNonce + i,
                }),
            ),
        )

        const allRawTxs: Hex[] = []
        const firstBatchCount = Math.floor(NUM_BLOCK_FILLING_TXS * 0.3)

        // Add first batch of block fillers
        allRawTxs.push(...blockFillerRawTxs.slice(0, firstBatchCount))
        // Add stuck transactions
        allRawTxs.push(...stuckRawTxs)
        // Add remaining block fillers
        allRawTxs.push(...blockFillerRawTxs.slice(firstBatchCount))

        console.log(`\nSending ${allRawTxs.length} raw transactions in parallel...`)
        await Promise.all(
            allRawTxs.map((serializedTransaction) => publicClient.sendRawTransaction({ serializedTransaction })),
        )

        console.log("\n\x1b[1m\x1b[34m═════════ RUNNING RESYNC ═════════\x1b[0m")
        await Promise.all([resyncAccount(executorAccount, "recheck"), monitorNonceGap()])
    } catch (error) {
        console.error(`Error in test: ${error}`)
        process.exit(1)
    }
}

async function monitorNonceGap(): Promise<void> {
    console.log("\n\x1b[1m\x1b[34m═════════ MONITORING NONCE GAP ═════════\x1b[0m")

    try {
        const startTime = Date.now()
        while (Date.now() - startTime < MONITOR_TIMEOUT) {
            const latestNonce = await publicClient.getTransactionCount({ address: executorAccount.address })
            const pendingNonce = await publicClient.getTransactionCount({
                address: executorAccount.address,
                blockTag: "pending",
            })

            const nonceGap = pendingNonce - latestNonce

            console.log("\nLatest nonce:", latestNonce)
            console.log("Pending nonce:", pendingNonce)
            console.log("Nonce gap:", nonceGap)

            if (nonceGap === 0) {
                console.log("\n\x1b[42m\x1b[30m SUCCESS \x1b[0m Nonce gap resolved successfully!")
                return
            }

            await sleep(1000)
        }

        console.log("\n\x1b[43m\x1b[30m TIMEOUT \x1b[0m Monitoring timed out, nonce gap may still exist.")
    } catch (error) {
        console.error("Error in monitorNonceGap:", error)
    }
}

run().catch(() => process.exit(1))
