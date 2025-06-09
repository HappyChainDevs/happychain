#!/usr/bin/env bun
import { execSync, spawn } from "node:child_process"
import type { ChildProcess } from "node:child_process"
import path from "node:path"
import { type Hex, Logger, logLevel, sleep, tryCatch } from "@happy.tech/common"
import { Anvil, type AnvilParams } from "@happy.tech/common/anvil"
import { privateKeyToAccount } from "viem/accounts"

// >>> NOTE: This script doesn't work <<<
// See "TODO This is the issue" below

// =====================================================================================================================
/**
 * This script tests the resync system by:
 * 1. Starting Anvil with a 2s block time and high base fee
 * 2. Sending multiple transactions with a low maxFeePerGas (preventing them from being included
 *    and keeping them stuck in the mempool) but a high maxPriorityFeePerGas (meaning they don't
 *    get instantly one-shotted by the resync routine, which will start with the onchain gas price).
 * 3. Starting the submitter and verifying the resync service cancels them.
 *
 * Note that Anvil will reject transactions with maxFeePerGas lower than the basefee, so we need to keep the initial
 * basefee low, submit the transactions, then immediately raise the basefee.
 *
 * This validates that we correctly:
 * - Detect nonce gap between latest and pending
 * - Send cancel transactions for the gap
 * - Ramp up the base and priority fee for cancellations
 */
// =====================================================================================================================
// CONFIGURATION

const BLOCK_TIME = 2
const NUM_TRANSACTIONS = 50
const PRINT_ALL_ANVIL = false
const PRINT_BLOCK_INFO = false
const PRINT_NONCE_STATUS = false

// Gas parameters (see above)
const INITIAL_BASE_FEE = 100n // low
const RAISED_BASE_FEE = 10_000_000_000n // high

// For maximum stress, this is the max the default config of the submitter is willing to pay.
// This can't be higher than the basefee, or Anvil will reject the transaction.
const STUCK_PRIORITY_FEE = 1000n

// Test executor account - use the first Anvil account.
const EXECUTOR_KEYS = (process.env.EXECUTOR_KEYS?.split(",") as Hex[]) ?? []
console.log(EXECUTOR_KEYS)
const executorAccount = privateKeyToAccount(EXECUTOR_KEYS[0])
console.log(executorAccount.address)

const anvilParams = {
    blockTime: BLOCK_TIME,
    extraCliArgs: [`--base-fee=${INITIAL_BASE_FEE}`],
    logger: Logger.create("Anvil", { level: logLevel(process.env.LOG_LEVEL) }),
    stdoutFilter,
    stderrFilter: () => true,
} satisfies AnvilParams

const anvil = new Anvil(anvilParams)

function stdoutFilter(output: string) {
    // Filter out noisy logs but keep important ones
    const select =
        PRINT_ALL_ANVIL ||
        output.includes("Error") ||
        output.includes("Exception") ||
        output.includes("Starting") ||
        output.includes("Listening") ||
        output.includes("Mining") ||
        (output.includes("Block ") && PRINT_BLOCK_INFO)
    const exclude = output.includes("underpriced") || output.includes("already imported")
    return select && !exclude
}

// =====================================================================================================================
// SEND UNDERPRICED TRANSACTIONS

// Send multiple underpriced transactions and create a nonce gap
async function sendUnderpricedTransactions(): Promise<void> {
    // Helper function to format a hash for display.
    const formatHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-4)}`

    console.log("\n\x1b[1m\x1b[34m═════════ CREATING NONCE GAP ═════════\x1b[0m")

    // Get the current nonce before we begin
    const startNonce = await anvil.public.getTransactionCount({
        address: executorAccount.address,
    })

    console.log(`Starting with nonce: ${startNonce}`)

    // Step 1: Send some transactions that WILL be mined to increase the nonce
    const confirmedTxCount = 5
    console.log(`1. Sending ${confirmedTxCount} transactions that will be mined (with adequate fees)...`)

    for (let i = 0; i < 5; i++) {
        const txHash = await anvil.wallet.sendTransaction({
            to: executorAccount.address,
            maxFeePerGas: 100_000_000_000n + INITIAL_BASE_FEE * 2n,
            maxPriorityFeePerGas: 0n,
        })
        console.log(`Sent mineable tx ${i + 1}/${confirmedTxCount} with hash ${formatHash(txHash)}`)
    }

    await sleep(BLOCK_TIME * 1000) // wait one block time

    // Check latest nonce after confirmed transactions
    const minedCount = await anvil.public.getTransactionCount({
        address: executorAccount.address,
    })
    if (minedCount !== confirmedTxCount)
        throw Error(`Only  ${minedCount}/${confirmedTxCount} of the transactions were included.`)

    // Step 2: Send transactions then raise base fee to make them stuck
    console.log("\n2. Sending transactions then raising base fee)...")

    const pendingTxCount = NUM_TRANSACTIONS - confirmedTxCount
    for (let i = 0; i < pendingTxCount; i++) {
        // Self-transfer with zero priority fee to ensure it gets stuck
        const txHash = await anvil.wallet.sendTransaction({
            to: executorAccount.address,
            // maxFeePerGas: (RAISED_BASE_FEE * 98n) / 100n,
            maxFeePerGas: RAISED_BASE_FEE + STUCK_PRIORITY_FEE,
            maxPriorityFeePerGas: STUCK_PRIORITY_FEE, // high, so repricing won't be instant
        })

        console.log(`Sent stuck tx tx ${i + 1}/${pendingTxCount} with hash ${formatHash(txHash)}`)
    }

    anvil.test.setNextBlockBaseFeePerGas({ baseFeePerGas: RAISED_BASE_FEE })

    // TODO This is the issue
    console.log(await anvil.test.getTxpoolStatus()) // shows txs pending
    await sleep(2000)
    console.log(await anvil.test.getTxpoolStatus()) // and ... they're gone
    // the rest fails because the nonce gap has disappeared (works without the sleep)
    // bumping maxFeePerGas to `RAISED_BASE_FEE + STUCK_PRIORITY_FEE` makes all the tx include instantly

    // Check nonces after sending all transactions
    const latestNonce = await anvil.public.getTransactionCount({
        address: executorAccount.address,
    })

    const pendingNonce = await anvil.public.getTransactionCount({
        address: executorAccount.address,
        blockTag: "pending",
    })

    const nonceDifference = pendingNonce - latestNonce

    console.log("\nCurrent state after sending transactions:")
    console.log(`- Latest nonce: ${latestNonce}`)
    console.log(`- Pending nonce: ${pendingNonce}`)
    console.log(`- Nonce gap: ${nonceDifference} transactions in mempool`)

    // Validate that we created a nonce gap as expected
    if (nonceDifference === pendingTxCount) {
        console.log(
            `\n\x1b[42m\x1b[30m SUCCESS \x1b[0m \x1b[32mCreated nonce gap of ${nonceDifference} transactions!\x1b[0m`,
        )
    } else {
        console.log(
            `\n\x1b[41m\x1b[30m WARNING \x1b[0m \x1b[33mExpected gap of ${pendingTxCount}, but found ${nonceDifference}\x1b[0m`,
        )
    }
}

// =====================================================================================================================
// START SUBMITTER SERVICE

function startSubmitter(): ChildProcess {
    // Kill any existing submitter process
    try {
        execSync('pkill -f "node --loader ts-node/esm/transpile-only index.ts"', { stdio: "ignore" })
    } catch {
        // Ignore errors if no process exists
    }

    console.log("Starting submitter service...")

    console.log("\nEnvironment variables set for submitter:")
    console.log("- EXECUTOR_KEYS:", process.env.EXECUTOR_KEYS)
    console.log("- RPC_URLS:", process.env.RPC_URLS)
    console.log("- CHAIN_ID:", process.env.CHAIN_ID)

    // Start the submitter process using the Makefile's dev command
    const submitter = spawn("make", ["dev"], {
        cwd: path.join(__dirname, ".."),
        env: process.env, // but .env file overrides this
        stdio: ["ignore", "pipe", "pipe"],
    })

    // Highlight different service logs with colors
    submitter.stdout.on("data", (data) => {
        const output = data.toString().trim()
        if (output.includes("[ResyncService]")) {
            console.log(`\x1b[32m${output}\x1b[0m`) // Green for ResyncService
        } else if (output.includes("Latest nonce") || output.includes("Pending nonce")) {
            console.log(`\x1b[33m${output}\x1b[0m`) // Yellow for nonce info
        } else if (output.includes("priority fee") || output.includes("cancel")) {
            console.log(`\x1b[36m${output}\x1b[0m`) // Cyan for priority fee/cancel actions
        } else {
            console.log(`[Submitter] ${output}`)
        }
    })

    submitter.stderr.on("data", (data) => {
        console.error(`[Submitter Error] ${data.toString().trim()}`)
    })

    return submitter
}

// Monitor nonce changes to verify transaction cancellation
async function monitorNonceChanges(): Promise<void> {
    console.log("\x1b[1m\x1b[34m═════════ MONITORING NONCE CHANGES ═════════\x1b[0m")

    const startTime = Date.now()
    const maxMonitorTime = 60 * 1000 // Monitor for up to 60 seconds
    let lastPendingNonce = await anvil.public.getTransactionCount({
        address: executorAccount.address,
        blockTag: "pending",
    })

    // Monitor progress bar characters
    const progressChars = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"]
    let progressIndex = 0

    while (Date.now() - startTime < maxMonitorTime) {
        const latestNonce = await anvil.public.getTransactionCount({
            address: executorAccount.address,
        })

        const pendingNonce = await anvil.public.getTransactionCount({
            address: executorAccount.address,
            blockTag: "pending",
        })

        // Update progress animation
        progressIndex = (progressIndex + 1) % progressChars.length
        const progressChar = progressChars[progressIndex]

        if (pendingNonce !== lastPendingNonce) {
            console.log(
                `\x1b[33m${progressChar} Nonce change detected: pending nonce ${lastPendingNonce} → ${pendingNonce}\x1b[0m`,
            )
            lastPendingNonce = pendingNonce
        }

        const gapSize = pendingNonce - latestNonce
        if (PRINT_NONCE_STATUS)
            console.log(`${progressChar} Nonces - Latest: ${latestNonce}, Pending: ${pendingNonce}, Gap: ${gapSize}`)

        // If latest nonce caught up with pending nonce, ResyncService has successfully replaced all transactions
        if (latestNonce === pendingNonce && latestNonce >= NUM_TRANSACTIONS) {
            console.log(
                "\n\x1b[42m\x1b[30m SUCCESS \x1b[0m \x1b[32m All transactions successfully processed! ResyncService is working correctly.\x1b[0m",
            )
            // Print a summary of what happened
            console.log("\n\x1b[1m\x1b[34m═════════ RESYNC SERVICE TEST SUMMARY ═════════\x1b[0m")
            console.log("✅ Created nonce gap with underpriced transactions")
            console.log("✅ Detected gap between latest and pending nonce")
            console.log("✅ Sent cancel transactions with higher priority fees")
            console.log("✅ Successfully resolved all stuck transactions")
            return
        }

        // Wait before checking again
        await sleep(1000)
    }

    console.log(
        "\n\x1b[41m\x1b[30m TIMEOUT \x1b[0m \x1b[31m Monitor timeout reached. Not all transactions were processed.\x1b[0m",
    )
}

// =====================================================================================================================
// START THE TEST

// Main function to run the test
async function runTest(): Promise<void> {
    console.log("\n\x1b[1m\x1b[34m═════════ RESYNC SERVICE TEST ═════════\x1b[0m")
    console.log("This test validates that the ResyncService properly:")
    console.log("1. Detects transactions stuck in the mempool")
    console.log("2. Sends cancel transactions with increasing priority fees")
    console.log("3. Resolves nonce gaps so the submitter can operate normally")
    // console.log(`4. Uses max priority fee of ${MAX_RESYNC_PRIORITY_FEE_GWEI} gwei (from env config)`)
    console.log(`Using account: ${executorAccount.address}`)

    // Track processes to ensure cleanup
    let submitter: ChildProcess | null = null

    // Ensure we clean up on unexpected exits
    const cleanup = () => {
        console.log("\nCleaning up processes...")
        tryCatch(() => submitter?.kill())
        anvil.stop()
    }

    // Set up cleanup handlers
    process.on("SIGINT", () => {
        console.log("\nReceived interrupt signal")
        cleanup()
        process.exit(1)
    })

    try {
        anvil.killConflictingProcesses()
        await anvil.start(5000)

        // Send several underpriced transactions that will get stuck
        await sendUnderpricedTransactions()

        // Wait a bit to ensure transactions are in mempool
        console.log("\nWaiting for transactions to be confirmed in mempool...")
        await sleep(3000)

        // Start submitter (which will trigger ResyncService)
        console.log("\nStarting submitter - ResyncService should run automatically on startup...")
        submitter = startSubmitter()

        // Give it some time to initialize
        await sleep(1000)

        // Monitor nonce changes to verify the ResyncService is working
        await monitorNonceChanges()

        // Clean up processes
        console.log("\nTest completed! Cleaning up processes...")
        cleanup()

        console.log("\n\x1b[1m\x1b[34m═════════ TEST COMPLETE ═════════\x1b[0m")
        process.exit(0)
    } catch (error) {
        console.error("\n\x1b[41m\x1b[30m ERROR \x1b[0m Test failed:", error)
        cleanup()
        process.exit(1)
    }
}

// Run the test
runTest().catch((error) => {
    console.error("Unhandled error in test:", error)
    process.exit(1)
})
