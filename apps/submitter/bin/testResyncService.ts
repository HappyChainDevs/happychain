#!/usr/bin/env bun
import { type Hex, sleep } from "@happy.tech/common"
import { abis, deployment } from "@happy.tech/contracts/mocks/sepolia"
import { happyChainSepolia } from "@happy.tech/wallet-common"
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

/**
 * This script tests the resync system by:
 * 1. Connecting to the testnet.happy.tech RPC endpoint
 * 2. Sending a few transactions with carefully tuned fees to stay in the mempool:
 *    - maxFeePerGas just at the baseFee level (to be accepted by the node)
 *    - maxPriorityFeePerGas set to 0 (to avoid being immediately included)
 * 3. Starting the submitter and verifying the resync service cancels them
 *
 * This validates that we correctly:
 * - Detect nonce gap between latest and pending
 * - Send cancel transactions for the gap
 * - Ramp up the base and priority fee for cancellations
 */

// Test configuration
const NUM_STUCK_TXS = 10 // Number of stuck transactions with 0 priority fee
const BLOCK_GAS_LIMIT = 30_000_000 // Estimated block gas limit (30M)
const TX_GAS_AMOUNT = 1_200_000n // Target gas usage per transaction
const NUM_BLOCKS_TO_FILL = 20 // Number of blocks worth of transactions to send
const MONITOR_TIMEOUT = 60_000 // 60 seconds timeout for monitoring

// Use floor calculation to ensure we can fit this many txs per block
const TXS_PER_BLOCK = Math.floor(Number(BLOCK_GAS_LIMIT) / Number(TX_GAS_AMOUNT))
const NUM_BLOCK_FILLING_TXS = TXS_PER_BLOCK * NUM_BLOCKS_TO_FILL

// TODO prev code here

// // Gas parameters (see above)
// const INITIAL_BASE_FEE = 100n // low
// const RAISED_BASE_FEE = 10_000_000_000n // high
//
// // For maximum stress, this is the max the default config of the submitter is willing to pay.
// // This can't be higher than the basefee, or Anvil will reject the transaction.
// const STUCK_PRIORITY_FEE = 1000n
//
// // Test executor account - use the first Anvil account.
// const EXECUTOR_KEYS = (process.env.EXECUTOR_KEYS?.split(",") as Hex[]) ?? []
// console.log(EXECUTOR_KEYS)
// const executorAccount = privateKeyToAccount(EXECUTOR_KEYS[0])
// console.log(executorAccount.address)
//
// const anvilParams = {
//     blockTime: BLOCK_TIME,
//     extraCliArgs: [`--base-fee=${INITIAL_BASE_FEE}`],
//     logger: Logger.create("Anvil", { level: logLevel(process.env.LOG_LEVEL) }),
//     stdoutFilter,
//     stderrFilter: () => true,
// } satisfies AnvilParams
//
// const anvil = new Anvil(anvilParams)
//
// function stdoutFilter(output: string) {
//     // Filter out noisy logs but keep important ones
//     const select =
//         PRINT_ALL_ANVIL ||
//         output.includes("Error") ||
//         output.includes("Exception") ||
//         output.includes("Starting") ||
//         output.includes("Listening") ||
//         output.includes("Mining") ||
//         (output.includes("Block ") && PRINT_BLOCK_INFO)
//     const exclude = output.includes("underpriced") || output.includes("already imported")
//     return select && !exclude

// RPC endpoints from the .env file (defaults to testnet if not specified)
const RPC_HTTP_URL = process.env.RPC_HTTP_URLS?.split(",")[0] ?? "https://rpc.testnet.happy.tech/http"

// Key setup - main executor key and block filler key
const EXECUTOR_KEY = process.env.EXECUTOR_KEYS?.split(",")[0]
const BLOCK_FILLER_KEY = process.env.EXECUTOR_KEYS?.split(",")[1]

if (!EXECUTOR_KEY || !BLOCK_FILLER_KEY) {
    throw new Error("Executor keys not found in environment variables")
}

console.log("\n⚠️  IMPORTANT: Using test accounts - ensure they're funded on testnet")
console.log(`- Executor account: will send ${NUM_STUCK_TXS} stuck transactions to simulate resync`)
console.log(
    `- Block filler account: will send ${NUM_BLOCK_FILLING_TXS} transactions (${NUM_BLOCKS_TO_FILL} blocks worth of gas)`,
)
console.log(`  Each transaction will burn approximately ${TX_GAS_AMOUNT.toLocaleString()} gas units`)

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

/**
 * Prepare a raw transaction to burn a specified amount of gas using the MockGasBurner contract
 * @returns The signed transaction raw bytes
 */
async function prepareBurnGasTransaction({
    walletClient,
    account,
    gasToBurn,
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce,
    gas,
}: {
    walletClient: WalletClient
    account: Account
    gasToBurn: bigint
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
    nonce: number
    gas: bigint
}): Promise<{ serializedTx: Hex; nonce: number; isStuck: boolean }> {
    // Prepare a contract transaction request
    const txRequest = await walletClient.prepareTransactionRequest({
        account,
        chain: happyChainSepolia,
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
    })

    // Sign the transaction
    const serializedTx = await walletClient.signTransaction({
        ...txRequest,
        chain: happyChainSepolia,
    })

    // Return the serialized transaction and metadata
    return {
        serializedTx,
        nonce,
        isStuck: maxPriorityFeePerGas === 0n,
    }
}

// =====================================================================================================================
// MAIN TEST FUNCTIONS

/**
 * Send block-filling transactions and stuck transactions, then run resync
 * 1. Send block-filling transactions from the block filler key to fill blocks
 * 2. Send transactions with zero priority fee from executor to create stuck txs
 * 3. Call resyncAccount on the executor account to verify it resolves the nonce gap
 */
async function runResyncTest(): Promise<void> {
    try {
        // const formatHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-4)}`
        // const formatFee = (fee: bigint) => formatGwei(fee) + " gwei"

        console.log("\n\x1b[1m\x1b[34m═════════ RESYNC SERVICE TEST ═════════\x1b[0m")

        // Get current network state
        const block = await publicClient.getBlock()
        const baseFee = block.baseFeePerGas || parseGwei("1") // Default to 1 gwei if baseFee not available

        // Get starting nonces for both accounts (both latest and pending)
        const [executorLatestNonce, executorPendingNonce, fillerLatestNonce, fillerPendingNonce] = await Promise.all([
            publicClient.getTransactionCount({ address: executorAccount.address }),
            publicClient.getTransactionCount({
                address: executorAccount.address,
                blockTag: "pending",
            }),
            publicClient.getTransactionCount({ address: blockFillerAccount.address }),
            publicClient.getTransactionCount({
                address: blockFillerAccount.address,
                blockTag: "pending",
            }),
        ])

        console.log("\nCurrent network state:")
        console.log(`- Current block:            ${block.number}`)
        console.log(`- Current base fee:         ${baseFee}`)
        console.log(`- Executor latest nonce:    ${executorLatestNonce}`)
        console.log(
            `- Executor pending nonce:   ${executorPendingNonce} (gap: ${executorPendingNonce - executorLatestNonce > 0 ? executorPendingNonce - executorLatestNonce : 0})`,
        )
        console.log(`- Block filler latest nonce: ${fillerLatestNonce}`)
        console.log(
            `- Block filler pending nonce: ${fillerPendingNonce} (gap: ${fillerPendingNonce - fillerLatestNonce > 0 ? fillerPendingNonce - fillerLatestNonce : 0})`,
        )

        // For block filling transactions: higher priority fee to ensure they're mined
        const fillerPriorityFee = baseFee

        // For stuck transactions: set priority fee to zero but ensure max fee covers base fee
        const stuckPriorityFee = 0n

        try {
            // Step 1: Prepare interleaved transactions - mix block-filling and stuck txs
            console.log(
                `\n1. Preparing ${NUM_BLOCK_FILLING_TXS} block-filling and ${NUM_STUCK_TXS} stuck transactions...`,
            )

            // Get the starting nonce for both accounts
            const currentBlockFillerNonce = await publicClient.getTransactionCount({
                address: blockFillerAccount.address,
            })
            console.log(`Block filler starting nonce: ${currentBlockFillerNonce}`)

            const currentExecutorNonce = await publicClient.getTransactionCount({
                address: executorAccount.address,
            })
            console.log(`Executor starting nonce: ${currentExecutorNonce}`)

            // First prepare all raw transactions
            const stuckRawTxs: { serializedTx: Hex; nonce: number; isStuck: boolean }[] = []
            const blockFillerRawTxs: { serializedTx: Hex; nonce: number; isStuck: boolean }[] = []

            // Prepare block filler transactions in parallel
            console.log(`Preparing ${NUM_BLOCK_FILLING_TXS} block-filling transactions in parallel...`)
            const blockFillerPromises = Array.from({ length: NUM_BLOCK_FILLING_TXS }, (_, i) =>
                prepareBurnGasTransaction({
                    walletClient: blockFillerWalletClient,
                    account: blockFillerAccount,
                    gasToBurn: TX_GAS_AMOUNT,
                    maxFeePerGas: baseFee * 2n,
                    maxPriorityFeePerGas: fillerPriorityFee,
                    nonce: currentBlockFillerNonce + i,
                    gas: TX_GAS_AMOUNT + 42000n,
                }),
            )

            // Prepare stuck transactions in parallel
            console.log(`Preparing ${NUM_STUCK_TXS} stuck transactions with zero priority fee in parallel...`)
            const stuckTxPromises = Array.from({ length: NUM_STUCK_TXS }, (_, i) =>
                prepareBurnGasTransaction({
                    walletClient: executorWalletClient,
                    account: executorAccount,
                    gasToBurn: TX_GAS_AMOUNT,
                    maxFeePerGas: baseFee + baseFee / 2n,
                    maxPriorityFeePerGas: stuckPriorityFee,
                    nonce: currentExecutorNonce + i,
                    gas: TX_GAS_AMOUNT + 42000n,
                }),
            )

            // Wait for all transactions to be prepared
            const [blockFillerResults, stuckTxResults] = await Promise.all([
                Promise.all(blockFillerPromises),
                Promise.all(stuckTxPromises),
            ])

            // Store the results
            blockFillerRawTxs.push(...blockFillerResults)
            stuckRawTxs.push(...stuckTxResults)

            // Interleave all transactions for sending
            const allRawTxs: { serializedTx: Hex; nonce: number; isStuck: boolean }[] = []

            // First batch of block-filling transactions (2/3 of total)
            const firstBatchCount = Math.floor(NUM_BLOCK_FILLING_TXS * 0.7)
            console.log(`\nInterleaving transactions: First ${firstBatchCount} block-filling transactions...`)
            for (let i = 0; i < firstBatchCount; i++) {
                allRawTxs.push(blockFillerRawTxs[i])
            }

            // Add all stuck transactions in the middle
            console.log(`Adding all ${stuckRawTxs.length} stuck transactions...`)
            stuckRawTxs.forEach((tx) => allRawTxs.push(tx))

            // Add remaining block-filling transactions
            console.log(`Adding remaining ${blockFillerRawTxs.length - firstBatchCount} block-filling transactions...`)
            for (let i = firstBatchCount; i < blockFillerRawTxs.length; i++) {
                allRawTxs.push(blockFillerRawTxs[i])
            }

            // Now send all raw transactions in parallel, in random order
            console.log(`\nSending ${allRawTxs.length} raw transactions in parallel...`)

            // Send all transactions in parallel and collect their hashes
            const sendTxPromises = allRawTxs.map((tx) =>
                publicClient.sendRawTransaction({
                    serializedTransaction: tx.serializedTx,
                }),
            )

            // Wait for all transactions to be sent and collect their hashes
            const _txHashes = await Promise.all(sendTxPromises)

            // Check nonces to verify we created a gap
            const latestNonce = await publicClient.getTransactionCount({ address: executorAccount.address })
            const pendingNonce = await publicClient.getTransactionCount({
                address: executorAccount.address,
                blockTag: "pending",
            })
            const nonceDifference = pendingNonce - latestNonce

            // Report the results
            console.log("\nCurrent state after sending transactions:")
            console.log(`- Latest nonce:  ${latestNonce} (confirmed on chain)`)
            console.log(`- Pending nonce: ${pendingNonce} (includes mempool)`)
            console.log(`- Nonce gap:     ${nonceDifference} transactions in mempool`)

            // Validate that we created a nonce gap as expected
            if (nonceDifference === NUM_STUCK_TXS) {
                console.log(
                    `\n\x1b[42m\x1b[30m SUCCESS \x1b[0m \x1b[32mCreated nonce gap of ${nonceDifference} transactions!\x1b[0m`,
                )
                // console.log("\nStuck transaction hashes:")
                // console.log(stuckHashes.join(", "))
            } else {
                console.log(
                    `\n\x1b[43m\x1b[30m WARNING \x1b[0m \x1b[33mExpected gap of ${NUM_STUCK_TXS}, but found ${nonceDifference}\x1b[0m`,
                )
                if (nonceDifference === 0) {
                    console.log("No nonce gap detected. Transactions may have been mined already.")
                    return
                }
            }

            // Step 5: Now call the actual resyncAccount function to resolve the nonce gap
            console.log("\n\x1b[1m\x1b[34m═════════ RUNNING RESYNC ═════════\x1b[0m")
            console.log("Calling resyncAccount on executor account...")

            // Start monitoring the nonce gap in parallel with resync
            console.log("\nStarting nonce gap monitor while resync is in progress...")
            const monitorPromise = monitorNonceGap()

            try {
                // Import the actual resyncAccount function
                const { resyncAccount } = await import("../lib/services/resync.js")

                // Run resync in parallel with monitoring
                const resyncPromise = resyncAccount(executorAccount, { resync: true })

                // Wait for both to complete or either to fail
                await Promise.all([
                    resyncPromise.then(() => console.log("Resync completed successfully")),
                    monitorPromise,
                ])
            } catch (error) {
                console.error("Error during resync or monitoring:", error)
                throw error
            }
        } catch (error) {
            console.error(`Error in test: ${error}`)
            throw error
        }
    } catch (error) {
        console.error(`Error in runResyncTest: ${error}`)
    }
}

// =====================================================================================================================
// MONITORING FUNCTIONS

/**
 * Monitor the nonce gap to see if it gets resolved
 * @returns Promise that resolves when the nonce gap is resolved or timeout is reached
 */
async function monitorNonceGap(): Promise<void> {
    console.log("\n\x1b[1m\x1b[34m═════════ MONITORING NONCE GAP ═════════\x1b[0m")

    try {
        const startTime = Date.now()

        while (Date.now() - startTime < MONITOR_TIMEOUT) {
            // Check if nonce gap is resolved
            const latestNonce = await publicClient.getTransactionCount({ address: executorAccount.address })
            const pendingNonce = await publicClient.getTransactionCount({
                address: executorAccount.address,
                blockTag: "pending",
            })

            const nonceGap = pendingNonce - latestNonce

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

// START THE TEST

async function run(): Promise<void> {
    try {
        console.log("\n\x1b[1m\x1b[34m══════════ RESYNC SERVICE TEST ══════════\x1b[0m")
        console.log("This test validates that the ResyncService properly resolves nonce gaps with stuck transactions")
        console.log(`Using executor account: ${executorAccount.address}`)
        console.log(`Using block filler account: ${blockFillerAccount.address}`)

        try {
            console.log("\n\x1b[1m\x1b[34m══════════ TESTING RESYNC SERVICE ON TESTNET ══════════\x1b[0m")
            console.log(`Connected to RPC: ${RPC_HTTP_URL}`)

            // Test the account balance first
            const executorBalance = await publicClient.getBalance({ address: executorAccount.address })
            const fillerBalance = await publicClient.getBalance({ address: blockFillerAccount.address })

            console.log(`\nExecutor account balance: ${formatEther(executorBalance)} ETH`)
            console.log(`Block filler balance: ${formatEther(fillerBalance)} ETH`)

            if (executorBalance < parseGwei("5000") || fillerBalance < parseGwei("5000")) {
                console.error(
                    "\n\x1b[41m\x1b[37m INSUFFICIENT FUNDS \x1b[0m One or both accounts have insufficient funds for testing. Please fund the accounts.",
                )
                return
            }

            // Run the main test
            await runResyncTest()

            console.log("\nTest completed successfully!")
        } catch (error) {
            console.error(`\n\x1b[41m ERROR \x1b[0m ${error}`)
            process.exit(1)
        }
    } catch (error) {
        console.error(`\n\x1b[41m ERROR \x1b[0m ${error}`)
        process.exit(1)
    }
}

run().catch((error: Error) => {
    console.error("Unhandled error in test:", error)
    process.exit(1)
})
