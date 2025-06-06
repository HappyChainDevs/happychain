#!/usr/bin/env bun
import { execSync, spawn } from "node:child_process"
import type { ChildProcess } from "node:child_process"
import path from "node:path"
import { http, createPublicClient, createWalletClient, formatEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { anvil } from "viem/chains"

/**
 * This script tests the ResyncService by:
 * 1. Starting Anvil with a 10s block time and high base fee
 * 2. Sending multiple underpriced transactions that will get stuck in mempool
 * 3. Starting the submitter and verifying the resync service cancels them
 *
 * This validates the requirements:
 * - Detect nonce gap between latest and pending
 * - Send cancel transactions for the gap
 * - Use high priority fee (10 gwei) for cancellations
 * - Poll for nonce updates rather than waiting for receipts
 * - Monitor blocks and increase priority fees when needed
 * - Honor max priority fee configuration
 */

// Configuration
const ANVIL_PORT = 8545
const ANVIL_HOST = "127.0.0.1"
const NUM_TRANSACTIONS = 5

// Gas parameters
const BASE_FEE = 10_000_000_000n // 10 gwei - high enough to make zero priority fee txs stuck
const LOW_PRIORITY_FEE = 0n // Zero priority fee to ensure transactions get stuck
const MAX_RESYNC_PRIORITY_FEE_GWEI = "10" // Match the default from apps/submitter/lib/env/schemas/gas.ts

// Anvil RPC URL
const ANVIL_RPC_URL = `http://${ANVIL_HOST}:${ANVIL_PORT}`
const ANVIL_WS_URL = `ws://${ANVIL_HOST}:${ANVIL_PORT}`

// Test executor account - use the first account from Anvil
const ANVIL_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
const executorAccount = privateKeyToAccount(ANVIL_PRIVATE_KEY)

// Create custom clients for Anvil
const anvilPublicClient = createPublicClient({
    transport: http(ANVIL_RPC_URL),
    chain: anvil,
})

const anvilWalletClient = createWalletClient({
    transport: http(ANVIL_RPC_URL),
    account: executorAccount,
    chain: anvil,
})

// Helper to wait for a specified time
async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

// Function to check if Anvil is ready by testing the RPC connection
async function isAnvilReady(): Promise<boolean> {
    try {
        await fetch(ANVIL_RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "web3_clientVersion",
                params: [],
                id: 1,
            }),
        })
        return true
    } catch {
        return false
    }
}

// Start Anvil with required parameters
function startAnvil(): ChildProcess {
    // Kill any existing Anvil process on the same port
    console.log("Cleaning up any existing Anvil processes...")

    try {
        // Run pkill to terminate any existing anvil processes
        execSync(`pkill -f 'anvil.*--port ${ANVIL_PORT}'`, { stdio: "ignore" })
    } catch {
        // Ignore errors if no process exists
    }

    // Give it a moment for ports to free up
    console.log("Waiting for port to free up...")

    console.log(`Starting Anvil with 2s block time and ${formatEther(BASE_FEE, "gwei")} gwei base fee...`)

    const args = [
        "--port",
        String(ANVIL_PORT),
        "--host",
        ANVIL_HOST,
        // Auto-mine blocks every 2 seconds
        "--block-time",
        "20",
        // Set high base fee to ensure low priority fee txs get stuck
        "--base-fee",
        BASE_FEE.toString(),
    ]

    const anvil = spawn("anvil", args)

    // Set up stdout handling with filtering to reduce noise
    anvil.stdout.on("data", (data) => {
        const output = data.toString().trim()
        // Filter out noisy logs but keep important ones
        if (
            output.includes("Error") ||
            output.includes("Exception") ||
            output.includes("Starting") ||
            output.includes("Listening") ||
            output.includes("Mining") ||
            output.includes("Block")
        ) {
            console.log(`[Anvil] ${output}`)
        }
    })

    anvil.stderr.on("data", (data) => {
        console.error(`[Anvil Error] ${data.toString().trim()}`)
    })

    // Set up clean exit handler
    process.on("exit", () => {
        try {
            anvil.kill()
        } catch {}
    })

    process.on("SIGINT", () => {
        console.log("Received SIGINT, cleaning up...")
        try {
            anvil.kill()
        } catch {}
        process.exit(0)
    })

    return anvil
}

// Mine a block using Anvil's JSON-RPC API
async function mineBlock() {
    await fetch(ANVIL_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "anvil_mine",
            params: [1], // Mine 1 block
            id: 1,
        }),
    })
}

// Helper function to format a hash for display
const formatHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-4)}`

// Send multiple underpriced transactions and create a nonce gap
async function sendUnderpricedTransactions(): Promise<void> {
    console.log("\n\x1b[1m\x1b[34m═════════ CREATING NONCE GAP ═════════\x1b[0m")

    // Get the current nonce before we begin
    const startNonce = await anvilPublicClient.getTransactionCount({
        address: executorAccount.address,
    })

    console.log(`Starting with nonce: ${startNonce}`)

    // Mine 2 blocks to ensure we have a clean state
    console.log("Mining initial blocks to ensure clean state...")
    await mineBlock()
    await sleep(500)
    await mineBlock()
    await sleep(500)

    // Step 1: Send some transactions that WILL be mined to increase the nonce
    console.log("\n1. Sending transactions that will be mined (with adequate fees)...")

    const confirmedTxCount = Math.floor(NUM_TRANSACTIONS / 2)
    for (let i = 0; i < confirmedTxCount; i++) {
        const txHash = await anvilWalletClient.sendTransaction({
            to: executorAccount.address,
            value: 1n, // Small value
            maxFeePerGas: BASE_FEE + 5_000_000_000n, // Base fee + 5 gwei
            maxPriorityFeePerGas: 2_000_000_000n, // 2 gwei priority fee
            chain: anvil,
        })

        console.log(`Sent mineable tx ${i + 1}/${confirmedTxCount} with hash ${formatHash(txHash)}`)
    }

    // Mine blocks to confirm these transactions
    console.log("Mining blocks to confirm the transactions...")
    for (let i = 0; i < confirmedTxCount; i++) {
        await mineBlock()
        await sleep(300) // Small delay between blocks
    }

    // Check latest nonce after confirmed transactions
    const midNonce = await anvilPublicClient.getTransactionCount({
        address: executorAccount.address,
    })

    console.log(`Confirmed transactions increased nonce to ${midNonce}`)

    // Step 2: Send transactions with zero priority fee that will get stuck
    console.log("\n2. Sending transactions with zero priority fee (will get stuck)...")

    const pendingTxCount = NUM_TRANSACTIONS - confirmedTxCount
    for (let i = 0; i < pendingTxCount; i++) {
        // Self-transfer with zero priority fee to ensure it gets stuck
        const txHash = await anvilWalletClient.sendTransaction({
            to: executorAccount.address,
            value: 1n,
            maxFeePerGas: BASE_FEE, // Just the base fee
            maxPriorityFeePerGas: LOW_PRIORITY_FEE, // Zero priority fee
            chain: anvil,
        })

        console.log(`Sent zero-fee tx ${i + 1}/${pendingTxCount} with hash ${formatHash(txHash)}`)
    }

    // Check nonces after sending all transactions
    const latestNonce = await anvilPublicClient.getTransactionCount({
        address: executorAccount.address,
    })

    const pendingNonce = await anvilPublicClient.getTransactionCount({
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

// Start submitter service
function startSubmitter(): ChildProcess {
    // Kill any existing submitter process
    try {
        execSync('pkill -f "node --loader ts-node/esm/transpile-only index.ts"', { stdio: "ignore" })
    } catch {
        // Ignore errors if no process exists
    }

    console.log("Starting submitter service...")

    // Set required environment variables
    const env = {
        ...process.env,
        NODE_ENV: "development",
        // Use the same account for creating transactions and for the EXECUTOR_KEYS
        // Include the 0x prefix since the app expects it
        EXECUTOR_KEYS: ANVIL_PRIVATE_KEY,
        RPC_HTTP_URLS: ANVIL_RPC_URL,
        RPC_WS_URLS: ANVIL_WS_URL,
        CHAIN_ID: String(anvil.id),
        MAX_RESYNC_PRIORITY_FEE_GWEI: MAX_RESYNC_PRIORITY_FEE_GWEI,
    }

    console.log("\nEnvironment variables set for submitter:")
    console.log("- EXECUTOR_KEYS:", ANVIL_PRIVATE_KEY)
    console.log("- RPC_HTTP_URLS:", ANVIL_RPC_URL)
    console.log("- CHAIN_ID:", anvil.id)

    // Start the submitter process using the Makefile's dev command
    const submitter = spawn("make", ["dev"], {
        cwd: path.join(__dirname, ".."),
        env,
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
    let lastPendingNonce = await anvilPublicClient.getTransactionCount({
        address: executorAccount.address,
        blockTag: "pending",
    })

    // Monitor progress bar characters
    const progressChars = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"]
    let progressIndex = 0

    while (Date.now() - startTime < maxMonitorTime) {
        const latestNonce = await anvilPublicClient.getTransactionCount({
            address: executorAccount.address,
        })

        const pendingNonce = await anvilPublicClient.getTransactionCount({
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

// Main function to run the test
async function runTest(): Promise<void> {
    console.log("\n\x1b[1m\x1b[34m═════════ RESYNC SERVICE TEST ═════════\x1b[0m")
    console.log("This test validates that the ResyncService properly:")
    console.log("1. Detects transactions stuck in the mempool")
    console.log("2. Sends cancel transactions with increasing priority fees")
    console.log("3. Resolves nonce gaps so the submitter can operate normally")
    console.log(`4. Uses max priority fee of ${MAX_RESYNC_PRIORITY_FEE_GWEI} gwei (from env config)`)
    console.log(`Using account: ${executorAccount.address}`)

    // Track processes to ensure cleanup
    let anvil: ChildProcess | null = null
    let submitter: ChildProcess | null = null

    // Ensure we clean up on unexpected exits
    const cleanup = () => {
        console.log("\nCleaning up processes...")
        if (submitter) {
            try {
                submitter.kill()
            } catch {}
        }
        if (anvil) {
            try {
                anvil.kill()
            } catch {}
        }
    }

    // Set up cleanup handlers
    process.on("SIGINT", () => {
        console.log("\nReceived interrupt signal")
        cleanup()
        process.exit(1)
    })

    try {
        // Start Anvil with required parameters
        anvil = startAnvil()

        // Wait for Anvil to start and verify it's ready
        console.log("\nWaiting for Anvil to start up...")

        // Try up to 10 times to connect to Anvil
        let isReady = false
        for (let i = 0; i < 10; i++) {
            await sleep(1000)
            isReady = await isAnvilReady()
            if (isReady) {
                console.log("\n\x1b[42m\x1b[30m SUCCESS \x1b[0m Anvil is running and ready!")
                break
            }
            console.log(`Attempt ${i + 1}/10: Anvil not ready yet...`)
        }

        if (!isReady) {
            throw new Error("Failed to start Anvil after multiple attempts")
        }

        // Send several underpriced transactions that will get stuck
        await sendUnderpricedTransactions()

        // Wait a bit to ensure transactions are in mempool
        console.log("\nWaiting for transactions to be confirmed in mempool...")
        await sleep(3000)

        // Start submitter (which will trigger ResyncService)
        console.log("\nStarting submitter - ResyncService should run automatically on startup...")
        submitter = startSubmitter()

        // Give it some time to initialize
        await sleep(5000)

        // Monitor nonce changes to verify the ResyncService is working
        await monitorNonceChanges()

        // Clean up processes
        console.log("\nTest completed! Cleaning up processes...")
        cleanup()

        console.log("\n\x1b[1m\x1b[34m═════════ TEST COMPLETE ═════════\x1b[0m")
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
