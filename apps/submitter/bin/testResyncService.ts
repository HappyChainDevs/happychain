#!/usr/bin/env bun
import { execSync, spawn } from "node:child_process"
import type { ChildProcess } from "node:child_process"
import path from "node:path"
import { type Hex, sleep } from "@happy.tech/common"
import { formatEther, formatGwei, parseGwei } from "viem"
import { http, createPublicClient, createWalletClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"

// =====================================================================================================================
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
// =====================================================================================================================
// CONFIGURATION

// Test configuration
const NUM_CONFIRMED_TXS = 2 // Number of transactions that will be mined immediately
const NUM_STUCK_TXS = 3 // Number of transactions to send with low priority fee
const MONITOR_TIMEOUT = 30 * 1000 // 30 seconds timeout for monitoring

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
const EXECUTOR_KEY = process.env.EXECUTOR_KEYS?.split(",")[0] ?? "" // Requires a funded key
if (!EXECUTOR_KEY) {
    throw new Error("No executor key found in env! Set EXECUTOR_KEYS")
}

const executorAccount = privateKeyToAccount(EXECUTOR_KEY as Hex)

const publicClient = createPublicClient({
    transport: http(RPC_HTTP_URL),
})

const walletClient = createWalletClient({
    account: executorAccount,
    transport: http(RPC_HTTP_URL),
})

// =====================================================================================================================
// SEND UNDERPRICED TRANSACTIONS

/**
 * Send multiple underpriced transactions to create a nonce gap that requires resync
 * On testnet, we'll send:
 * 1. A few transactions with normal fee that will be included
 * 2. A few transactions with zero priority fee to create a stuck transaction gap
 */
async function sendUnderpricedTransactions(): Promise<void> {
    const formatHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-4)}`
    const formatFee = (fee: bigint) => formatGwei(fee) + " gwei"

    console.log("\n\x1b[1m\x1b[34m═════════ CREATING NONCE GAP ═════════\x1b[0m")

    // Get current network state
    const block = await publicClient.getBlock()
    const baseFee = block.baseFeePerGas || parseGwei("1") // Default to 1 gwei if baseFee not available
    const currentNonce = await publicClient.getTransactionCount({ address: executorAccount.address })

    console.log("\nCurrent network state:")
    console.log(`- Current block:    ${block.number}`)
    console.log(`- Current base fee: ${formatFee(baseFee)}`)
    console.log(`- Starting nonce:   ${currentNonce}`)

    // Base fee on testnet can be extremely low, so we need to handle that
    console.log(`Note: Testnet base fee is extremely low: ${formatGwei(baseFee)} gwei`)

    // For confirmed transactions: use the priority fee we want plus the base fee
    const confirmedPriorityFee = baseFee // Very small priority fee that will work with low base fees
    const confirmedMaxFee = baseFee + confirmedPriorityFee + (baseFee * 25n) / 100n // Base fee + priority + 25% buffer

    // For stuck transactions: set priority fee to zero but ensure max fee covers base fee
    const stuckPriorityFee = 0n
    const stuckMaxFee = baseFee // Just enough to get accepted into mempool, but likely won't be mined

    // Get the current nonce from the network before we start sending transactions
    const startingNonce = await publicClient.getTransactionCount({
        address: executorAccount.address,
        blockTag: "latest",
    })
    console.log(`Starting nonce from network: ${startingNonce}`)

    // Step 1: Send transactions that will confirm quickly
    console.log("\n1. Sending", NUM_CONFIRMED_TXS, "transactions that will be mined quickly...")
    const confirmedHashes: Hex[] = []
    let nextNonce = startingNonce

    try {
        for (let i = 0; i < NUM_CONFIRMED_TXS; i++) {
            const hash = await walletClient.sendTransaction({
                chain: null,
                to: executorAccount.address,
                value: 0n,
                nonce: nextNonce++, // Use explicit nonce and increment for next tx
                maxFeePerGas: confirmedMaxFee,
                maxPriorityFeePerGas: confirmedPriorityFee,
            })
            confirmedHashes.push(hash)
            console.log(
                `Sent confirmable tx ${i + 1}/${NUM_CONFIRMED_TXS} with hash ${formatHash(hash)} ` +
                    `(maxFee: ${formatFee(confirmedMaxFee)}, priority: ${formatFee(confirmedPriorityFee)})`,
            )
        }
    } catch (error) {
        console.error(`Error sending confirmed transactions: ${error}`)
        throw error
    }

    // Wait for transactions to be included (approximately 1-2 block times)
    console.log("\nWaiting for confirmed transactions to be mined...")
    await sleep(6000) // ~ 3 blocks

    // Check if transactions were included
    const currentConfirmedNonce = await publicClient.getTransactionCount({ address: executorAccount.address })
    console.log(`Nonce before:   ${currentNonce}, after: ${currentConfirmedNonce}`)

    if (currentConfirmedNonce < currentNonce + NUM_CONFIRMED_TXS) {
        console.log("\n\x1b[43m\x1b[30m WARNING \x1b[0m Not all confirmed transactions were included yet.")
        console.log("Waiting additional time for confirmations...")
        await sleep(10000) // Wait additional 10 seconds
    }

    // Step 2: Send transactions that should get stuck
    console.log("\n2. Sending", NUM_STUCK_TXS, "transactions with zero priority fee (should get stuck)...")

    // Double-check what the latest nonce is after our confirmed transactions
    const updatedNonce = await publicClient.getTransactionCount({
        address: executorAccount.address,
        blockTag: "latest",
    })

    // nextNonce should already be set correctly from previous section
    console.log(`Current nonce from chain: ${updatedNonce}, Next nonce to use: ${nextNonce}`)

    // If somehow the chain nonce is higher than what we were tracking, update nextNonce
    if (updatedNonce > nextNonce) {
        console.log(`Adjusting nonce: ${nextNonce} -> ${updatedNonce}`)
        nextNonce = updatedNonce
    }

    const stuckHashes: Hex[] = []

    try {
        for (let i = 0; i < NUM_STUCK_TXS; i++) {
            const hash = await walletClient.sendTransaction({
                chain: null,
                to: executorAccount.address,
                value: 0n,
                nonce: nextNonce++, // Use explicit nonce and increment for next tx
                maxFeePerGas: stuckMaxFee,
                maxPriorityFeePerGas: stuckPriorityFee,
            })
            stuckHashes.push(hash)
            console.log(
                `Sent stuck tx ${i + 1}/${NUM_STUCK_TXS} with hash ${formatHash(hash)} ` +
                    `(maxFee: ${formatFee(stuckMaxFee)}, priority: ${formatFee(stuckPriorityFee)})`,
            )
        }
    } catch (error) {
        console.error(`Error sending stuck transactions: ${error}`)
        throw error
    }

    // Check nonces to verify we created a gap
    const finalLatestNonce = await publicClient.getTransactionCount({ address: executorAccount.address })
    const pendingNonce = await publicClient.getTransactionCount({
        address: executorAccount.address,
        blockTag: "pending",
    })
    const nonceDifference = pendingNonce - finalLatestNonce

    // Report the results
    console.log("\nCurrent state after sending transactions:")
    console.log(`- Latest nonce:  ${finalLatestNonce} (confirmed on chain)`)
    console.log(`- Pending nonce: ${pendingNonce} (includes mempool)`)
    console.log(`- Nonce gap:          ${nonceDifference} transactions in mempool`)

    // Validate that we created a nonce gap as expected
    if (nonceDifference === NUM_STUCK_TXS) {
        console.log(
            `\n\x1b[42m\x1b[30m SUCCESS \x1b[0m \x1b[32mCreated nonce gap of ${nonceDifference} transactions!\x1b[0m`,
        )

        console.log("\nTransaction hashes:")
        console.log("Confirmed:", confirmedHashes.map(formatHash).join(", "))
        console.log("Stuck:", stuckHashes.map(formatHash).join(", "))
    } else {
        console.log(
            `\n\x1b[41m\x1b[30m WARNING \x1b[0m \x1b[33mExpected gap of ${NUM_STUCK_TXS}, but found ${nonceDifference}\x1b[0m`,
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

    console.log("\n\x1b[1m\x1b[34m═════════ STARTING SUBMITTER SERVICE ═════════\x1b[0m")

    // Start the submitter process using the Makefile's dev command
    const submitter = spawn("make", ["dev"], {
        cwd: path.join(__dirname, ".."),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
    })

    // Highlight different service logs with colors
    submitter.stdout.on("data", (data) => {
        const output = data.toString().trim()
        if (output.includes("[ResyncService]")) {
            console.log(`\x1b[32m${output}\x1b[0m`) // Green for ResyncService
        } else if (output.includes("alert") || output.includes("ALERT")) {
            console.log(`\x1b[41m\x1b[37m${output}\x1b[0m`) // White on red background for alerts
        } else if (output.includes("Latest nonce") || output.includes("Pending nonce")) {
            console.log(`\x1b[33m${output}\x1b[0m`) // Yellow for nonce info
        } else if (output.includes("nonce") || output.includes("Nonce")) {
            console.log(`\x1b[36m${output}\x1b[0m`) // Cyan for other nonce messages
        } else {
            console.log(output)
        }
    })

    submitter.stderr.on("data", (data) => {
        console.error(`\x1b[31m${data.toString().trim()}\x1b[0m`)
    })

    // Handle process exit
    submitter.on("close", (code) => {
        if (code !== 0) {
            console.log(`\nSubmitter process exited with code ${code}`)
        }
    })

    return submitter
}

// =====================================================================================================================
// MONITORING FUNCTIONS

async function monitorNonceGap(): Promise<void> {
    console.log("\n\x1b[1m\x1b[34m═════════ MONITORING NONCE GAP ═════════\x1b[0m")

    const startTime = Date.now()

    while (Date.now() - startTime < MONITOR_TIMEOUT) {
        const latestNonce = await publicClient.getTransactionCount({
            address: executorAccount.address,
        })

        const pendingNonce = await publicClient.getTransactionCount({
            address: executorAccount.address,
            blockTag: "pending",
        })

        const nonceDifference = pendingNonce - latestNonce

        const timeElapsed = Math.floor((Date.now() - startTime) / 1000)

        const status = nonceDifference === 0 ? "\x1b[42m\x1b[30m RESOLVED \x1b[0m" : "\x1b[43m\x1b[30m WAITING  \x1b[0m"

        console.log(
            `${status} Time: ${timeElapsed}s | Latest: ${latestNonce} | Pending: ${pendingNonce} | Gap: ${nonceDifference}`,
        )

        if (nonceDifference === 0) {
            console.log(
                "\n\x1b[42m\x1b[30m SUCCESS \x1b[0m \x1b[32mNonce gap resolved successfully by resync service!\x1b[0m",
            )
            return
        }

        // Wait before checking again
        await sleep(1000)
    }

    console.log(
        "\n\x1b[41m\x1b[30m TIMEOUT \x1b[0m \x1b[31m Monitor timeout reached. Not all transactions were processed.\x1b[0m",
    )
}

// START THE TEST

async function run(): Promise<void> {
    console.log("\n\x1b[1m\x1b[34m═════════ RESYNC SERVICE TEST ═════════\x1b[0m")
    console.log("This test validates that the ResyncService properly:")
    console.log(`Using account: ${executorAccount.address}`)

    try {
        console.log("\n\x1b[1m\x1b[34m═════════ TESTING RESYNC SERVICE ON TESTNET ═════════\x1b[0m")
        console.log(`Connected to RPC: ${RPC_HTTP_URL}`)

        // Test the account balance first
        const balance = await publicClient.getBalance({ address: executorAccount.address })
        console.log(`\nAccount balance: ${formatEther(balance)} ETH`)

        if (balance < parseGwei("5000")) {
            console.error(
                "\n\x1b[41m\x1b[37m INSUFFICIENT FUNDS \x1b[0m Account has insufficient funds for testing. Please fund the account.",
            )
            return
        }

        // Send underpriced transactions to create a nonce gap
        await sendUnderpricedTransactions()

        // Start the submitter service which should detect and fix the nonce gap
        const submitter = startSubmitter()

        // Wait a bit for the submitter to fully initialize
        await sleep(5000)

        // Monitor the nonce gap to see if the resync service resolves it
        await monitorNonceGap()

        // Cleanup: Stop the submitter service
        console.log("\nStopping submitter service...")
        submitter.kill()

        console.log("\nTest completed successfully!")
    } catch (error) {
        console.error(`\n\x1b[41m ERROR \x1b[0m ${error}`)
        process.exit(1)
    }
}

run().catch((error: Error) => {
    console.error("Unhandled error in test:", error)
    process.exit(1)
})
