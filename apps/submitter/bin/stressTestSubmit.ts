/**
 * Stress test for the submit endpoint.
 * Sends multiple concurrent requests to submit boops and measures performance.
 */

import { type Boop, BoopClient, CreateAccount, computeBoopHash } from "@happy.tech/boop-sdk"
import { type Hash, stringify } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createAndSignMintBoop } from "#lib/utils/test/helpers" // no barrel import: don't start services
import { endNonceMonitoring, startNonceMonitoring, trackCreatedAccount } from "./utils/nonceMonitor"

// Configuration
const DEFAULT_CONFIG = {
    concurrentRequests: 100,
    batchSize: 10,
    delayBetweenBatchesMs: 100,
    submitterUrl: "http://localhost:3001",
}

interface StressTestConfig {
    concurrentRequests: number
    batchSize: number
    delayBetweenBatchesMs: number
    submitterUrl: string
}

// Define types for test results and responses
interface BoopReceipt {
    boopHash: Hash
    evmTxHash: Hash
    status: string
    blockHash: Hash
    blockNumber: bigint
    gasPrice: bigint
    boop: Boop
}

interface GetStateOutput {
    status: string
    receipt?: BoopReceipt
    simulation?: {
        status: string
    }
}

interface TestResult {
    success: boolean
    latencyMs: number
    status: string
    boopHash?: Hash
    error?: string
    receipt?: BoopReceipt
    state?: GetStateOutput
}

/**
 * Run the stress test for submit endpoint
 */
async function runStressTest(
    config: StressTestConfig = DEFAULT_CONFIG,
): Promise<{ results: TestResult[]; boopClient: BoopClient }> {
    console.log(`
=== SUBMIT ENDPOINT STRESS TEST ===
Submitter URL: ${config.submitterUrl}
Concurrent Requests: ${config.concurrentRequests}
Batch Size: ${config.batchSize}
Delay Between Batches: ${config.delayBetweenBatchesMs}ms
=================================
`)

    // Create a BoopClient instance
    const boopClient = new BoopClient({ submitterUrl: config.submitterUrl })

    // Initialize nonce monitoring
    console.log("=== Starting Nonce Monitoring ===")
    await startNonceMonitoring()

    // Create a test account for this run
    console.log("Creating test account...")
    const eoa = privateKeyToAccount(generatePrivateKey())
    const createAccountResult = await boopClient.createAccount({
        owner: eoa.address,
        salt: "0x0000000000000000000000000000000000000000000000000000000000000001",
    })

    if (
        createAccountResult.status !== CreateAccount.Success &&
        createAccountResult.status !== "createAccountAlreadyCreated"
    ) {
        throw new Error("Account creation failed: " + stringify(createAccountResult))
    }

    const account = createAccountResult.address
    console.log(`Test account created: ${account}`)

    // Track the created account
    trackCreatedAccount(account)

    // Calculate number of batches
    const batches = Math.ceil(config.concurrentRequests / config.batchSize)
    console.log(`Executing ${batches} batches of ${config.batchSize} requests...`)

    // Store results for reporting
    const results: TestResult[] = []
    const latencies: number[] = []

    // Initialize counters for this test run

    // Execute batches
    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        const batchStart = performance.now()
        const batchPromises: Promise<void>[] = []

        const remainingRequests = Math.min(config.batchSize, config.concurrentRequests - batchIndex * config.batchSize)

        console.log(`Batch ${batchIndex + 1}/${batches}: Sending ${remainingRequests} requests...`)

        for (let i = 0; i < remainingRequests; i++) {
            batchPromises.push(
                (async () => {
                    // Using nonceTrack to distribute requests across different tracks
                    // This helps avoid nonce conflicts when submitting many transactions
                    const nonceValue = BigInt(i % 50)
                    const nonceTrack = BigInt(Math.floor(i / 50) + batchIndex * 10)

                    try {
                        // Create and sign a boop for submission
                        const boop = await createAndSignMintBoop(eoa, { account, nonceTrack, nonceValue })
                        const boopHash = computeBoopHash(216n, boop)

                        const start = performance.now()
                        const result = await boopClient.submit({ boop })

                        // Store the initial result
                        const testResult = {
                            success: true,
                            latencyMs: Math.round(performance.now() - start),
                            status: result.status,
                            boopHash: result.boopHash || boopHash,
                        }

                        // Add to results immediately so we don't lose track of it
                        results.push(testResult)

                        // Now poll for boop state and receipt asynchronously
                        // This won't block the main stress test flow
                        if (testResult.boopHash) {
                            void pollBoopStateAndReceipt(boopClient, testResult.boopHash, testResult)
                        }
                    } catch (error) {
                        results.push({
                            success: false,
                            latencyMs: 0, // Can't measure latency for failed requests
                            status: "error",
                            error: stringify(error),
                        })
                    }
                })(),
            )
        }

        // Wait for all requests in this batch to complete
        await Promise.all(batchPromises)

        const batchEnd = performance.now()
        const batchDuration = Math.round(batchEnd - batchStart)
        console.log(`Batch ${batchIndex + 1} completed in ${batchDuration}ms`)

        // Store latencies for reporting
        results.forEach((result) => {
            if (result.success && result.latencyMs > 0) {
                latencies.push(result.latencyMs)
            }
        })

        // Wait between batches if not the last batch
        if (batchIndex < batches - 1) {
            console.log(`Waiting ${config.delayBetweenBatchesMs}ms before next batch...`)
            await new Promise((resolve) => setTimeout(resolve, config.delayBetweenBatchesMs))
        }
    }

    // Calculate success rate
    const totalRequests = results.length
    const successfulRequests = results.filter((r) => r.success).length
    const successRate = (successfulRequests / totalRequests) * 100

    // Calculate latency statistics
    latencies.sort((a, b) => a - b)
    const avgLatency = latencies.reduce((sum, val) => sum + val, 0) / latencies.length
    const minLatency = latencies[0] || 0
    const maxLatency = latencies[latencies.length - 1] || 0
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0
    const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0

    // Get successful transaction hashes for verification
    const successfulHashes = results
        .filter((r) => r.success && r.boopHash)
        .map((r) => r.boopHash)
        .filter(Boolean) as string[]

    // Print results
    console.log("\n=== RESULTS ===")
    console.log(`Total Requests: ${totalRequests}`)
    console.log(`Success: ${successfulRequests} (${successRate.toFixed(2)}%)`)

    console.log("\n=== TRANSACTION HASHES (for manual verification) ===")
    console.log(`Successful transaction hashes (${successfulHashes.length}):`)
    console.log(JSON.stringify(successfulHashes, null, 2))
    console.log(`Receipt status summary: ${JSON.stringify(receiptStatusCounts, null, 2)}`)

    console.log("\nFailures: " + (totalRequests - successfulRequests))

    console.log("\n=== LATENCY (ms) ===")
    console.log(`Average: ${avgLatency.toFixed(2)}`)
    console.log(`Min: ${minLatency}`)
    console.log(`Max: ${maxLatency}`)
    console.log(`P50: ${p50}`)
    console.log(`P90: ${p90}`)
    console.log(`P95: ${p95}`)
    console.log(`P99: ${p99}`)

    // End nonce monitoring
    console.log("\n=== Ending Nonce Monitoring ===")
    await endNonceMonitoring()

    // Print accounts created during test
    console.log("\n=== ACCOUNTS CREATED DURING TEST (1) ===")
    console.log(account)

    // Return the results and boopClient for final polling
    return { results, boopClient }
}

// Parse command line arguments
function parseArgs(): StressTestConfig {
    const args = process.argv.slice(2)
    const config = { ...DEFAULT_CONFIG }

    for (let i = 0; i < args.length; i += 2) {
        const key = args[i]
        const value = args[i + 1]

        switch (key) {
            case "--requests":
            case "-r":
                config.concurrentRequests = Number.parseInt(value, 10)
                break
            case "--batch-size":
            case "-b":
                config.batchSize = Number.parseInt(value, 10)
                break
            case "--delay":
            case "-d":
                config.delayBetweenBatchesMs = Number.parseInt(value, 10)
                break
            case "--url":
            case "-u":
                config.submitterUrl = value
                break
        }
    }

    return config
}

// Track receipt statuses for summary reporting
const receiptStatusCounts: Record<string, number> = {}

// Track all transaction hashes for comprehensive polling
const allTransactionHashes: Hash[] = []

// Track unique transaction hashes to avoid duplicates
const uniqueTransactionHashes = new Set<string>()

// Track polling attempts and timing for each transaction
const pollingStats: Record<
    string,
    {
        attempts: number
        firstPollTime?: number
        lastPollTime?: number
        receiptFoundTime?: number
        totalPollingTimeMs?: number
        success: boolean
    }
> = {}

/**
 * Polls the boop state and receipt endpoints for a given boop hash
 * Updates the test result object with the retrieved data
 */
async function pollBoopStateAndReceipt(boopClient: BoopClient, hash: Hash, testResult: TestResult) {
    // Add hash to global tracking array for final polling (with deduplication)
    const hashStr = hash.toString()
    if (!uniqueTransactionHashes.has(hashStr)) {
        allTransactionHashes.push(hash)
        uniqueTransactionHashes.add(hashStr)
        console.log(
            `[Tracking] Added new transaction ${hash.substring(0, 8)}... to tracking (total: ${allTransactionHashes.length})`,
        )
    }

    // Initialize polling stats for this hash if not already tracking
    if (!pollingStats[hash]) {
        pollingStats[hash] = {
            attempts: 0,
            firstPollTime: Date.now(),
            success: false,
        }
    }

    const maxTries = 20
    const delayMs = 1000

    for (let i = 0; i < maxTries; i++) {
        // Update polling stats
        pollingStats[hash].attempts++
        pollingStats[hash].lastPollTime = Date.now()

        try {
            // Poll for boop state
            const stateResponse = await boopClient.getState({ boopHash: hash })
            if (stateResponse) {
                testResult.state = stateResponse
            }

            // Poll for receipt
            const receiptResponse = await boopClient.waitForReceipt({ boopHash: hash, timeout: 2000 })
            if (receiptResponse?.receipt) {
                testResult.receipt = receiptResponse.receipt

                // Count receipt statuses for summary (with deduplication)
                if (receiptResponse.receipt.status && !pollingStats[hash].success) {
                    const status = receiptResponse.receipt.status
                    receiptStatusCounts[status] = (receiptStatusCounts[status] || 0) + 1

                    // Mark as successful and record timing
                    pollingStats[hash].success = true
                    pollingStats[hash].receiptFoundTime = Date.now()
                    pollingStats[hash].totalPollingTimeMs =
                        pollingStats[hash].receiptFoundTime - (pollingStats[hash].firstPollTime || 0)

                    console.log(
                        `[Poll] Receipt found for ${hash.substring(0, 8)}... after ${pollingStats[hash].attempts} attempts (${pollingStats[hash].totalPollingTimeMs}ms) at ${new Date().toISOString()}`,
                    )
                }
            }

            // If we have a receipt with a status, we can stop polling
            if (receiptResponse.receipt?.status) {
                return
            }
        } catch (_error) {
            // Continue polling even if there's an error
            // This could be because the boop is not yet processed
            await new Promise((resolve) => setTimeout(resolve, delayMs))
            continue
        }

        // Wait before the next polling attempt
        await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    // Log if we couldn't get a receipt after max tries
    if (!pollingStats[hash].success) {
        console.log(`[Poll] No receipt found for ${hash.substring(0, 8)}... after ${maxTries} attempts`)
    }
}

/**
 * Performs a final polling pass for all transactions to ensure we get as many receipts as possible
 * This is run after all submissions are complete
 */
async function finalPollingPass(boopClient: BoopClient, results: TestResult[]): Promise<void> {
    console.log("\n=== Performing final receipt polling pass... ===")
    console.log(`Polling ${allTransactionHashes.length} unique transactions with longer timeout...`)

    // Use a longer timeout and more attempts for the final pass
    const maxTries = 30
    const delayMs = 1000

    // Create a map of hash to test result for easy lookup
    const resultsByHash = new Map<Hash, TestResult>()
    for (const result of results) {
        if (result.boopHash) {
            resultsByHash.set(result.boopHash, result)
        }
    }

    // Track transactions that still need polling
    const transactionsNeedingPolling = allTransactionHashes.filter((hash) => {
        // Skip if we already have a successful receipt for this hash
        return !pollingStats[hash]?.success
    })

    console.log(`Found ${transactionsNeedingPolling.length} transactions that still need polling`)

    // Poll each transaction again with longer timeout
    const pollingPromises = transactionsNeedingPolling.map(async (hash) => {
        const testResult = resultsByHash.get(hash)
        if (!testResult) return

        // Initialize polling stats for this hash if not already tracking
        if (!pollingStats[hash]) {
            pollingStats[hash] = {
                attempts: 0,
                firstPollTime: Date.now(),
                success: false,
            }
        }

        let finalAttempt = 0

        for (let i = 0; i < maxTries; i++) {
            finalAttempt = i + 1
            pollingStats[hash].attempts++
            pollingStats[hash].lastPollTime = Date.now()

            try {
                // Poll for receipt with longer timeout
                const receiptResponse = await boopClient.waitForReceipt({ boopHash: hash, timeout: 3000 })
                if (receiptResponse?.receipt) {
                    testResult.receipt = receiptResponse.receipt

                    // Count receipt statuses for summary (with deduplication)
                    if (receiptResponse.receipt.status && !pollingStats[hash].success) {
                        const status = receiptResponse.receipt.status
                        receiptStatusCounts[status] = (receiptStatusCounts[status] || 0) + 1

                        // Mark as successful and record timing
                        pollingStats[hash].success = true
                        pollingStats[hash].receiptFoundTime = Date.now()
                        pollingStats[hash].totalPollingTimeMs =
                            pollingStats[hash].receiptFoundTime - (pollingStats[hash].firstPollTime || 0)

                        console.log(
                            `[Final Poll] Receipt found for ${hash.substring(0, 8)}... after ${finalAttempt} final attempts (${pollingStats[hash].totalPollingTimeMs}ms total) at ${new Date().toISOString()}`,
                        )
                        return // Stop polling this transaction once we have a status
                    }
                }
            } catch (_error) {
                // Continue polling even if there's an error
            }

            // Wait before the next polling attempt
            await new Promise((resolve) => setTimeout(resolve, delayMs))
        }

        // Log if we still couldn't get a receipt after max tries
        if (!pollingStats[hash].success) {
            console.log(
                `[Final Poll] No receipt found for ${hash.substring(0, 8)}... after ${finalAttempt} final attempts`,
            )
        }
    })

    // Wait for all polling to complete
    await Promise.all(pollingPromises)
    console.log("Final polling pass complete.")
}

/**
 * Calculate statistics for an array of numbers
 */
function calculateStats(values: number[]): {
    min: number
    max: number
    avg: number
    median: number
    mode: number
    p90: number
    p95: number
} {
    if (values.length === 0) {
        return { min: 0, max: 0, avg: 0, median: 0, mode: 0, p90: 0, p95: 0 }
    }

    // Sort the values for percentile calculations
    const sorted = [...values].sort((a, b) => a - b)

    // Calculate min, max, avg
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const avg = sorted.reduce((sum, val) => sum + val, 0) / sorted.length

    // Calculate median
    const midIndex = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0 ? (sorted[midIndex - 1] + sorted[midIndex]) / 2 : sorted[midIndex]

    // Calculate mode
    const counts: Record<number, number> = {}
    let mode = sorted[0]
    let maxCount = 0

    for (const value of sorted) {
        counts[value] = (counts[value] || 0) + 1
        if (counts[value] > maxCount) {
            maxCount = counts[value]
            mode = value
        }
    }

    // Calculate percentiles
    const p90 = sorted[Math.floor(sorted.length * 0.9)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]

    return { min, max, avg, median, mode, p90, p95 }
}

async function main() {
    try {
        const config = parseArgs()
        // Run the stress test and get the results and boopClient
        const { results, boopClient } = await runStressTest(config)

        // Perform a final polling pass to ensure we get as many receipts as possible
        console.log("\nStarting final polling pass to collect all receipts...")
        await finalPollingPass(boopClient, results)

        // Print the final receipt status counts after all polling is complete
        console.log("\n=== FINAL RECEIPT STATUS SUMMARY ===")
        console.log(JSON.stringify(receiptStatusCounts, null, 2))

        // Calculate and display polling statistics
        const successfulPolls = Object.entries(pollingStats).filter(([_, stats]) => stats.success)

        if (successfulPolls.length > 0) {
            const attemptCounts = successfulPolls.map(([_, stats]) => stats.attempts)
            const pollingTimes = successfulPolls
                .map(([_, stats]) => stats.totalPollingTimeMs || 0)
                .filter((time) => time > 0)

            const attemptStats = calculateStats(attemptCounts)
            const timeStats = calculateStats(pollingTimes)

            console.log("\n=== POLLING STATISTICS ===")
            console.log(`Total transactions tracked: ${Object.keys(pollingStats).length}`)
            console.log(`Successful receipts found: ${successfulPolls.length}`)
            console.log(
                `Success rate: ${((successfulPolls.length / Object.keys(pollingStats).length) * 100).toFixed(2)}%`,
            )

            console.log("\n=== POLLING ATTEMPTS ===")
            console.log(`Min attempts: ${attemptStats.min}`)
            console.log(`Max attempts: ${attemptStats.max}`)
            console.log(`Average attempts: ${attemptStats.avg.toFixed(2)}`)
            console.log(`Median attempts: ${attemptStats.median}`)
            console.log(`Mode attempts: ${attemptStats.mode}`)
            console.log(`90th percentile: ${attemptStats.p90}`)
            console.log(`95th percentile: ${attemptStats.p95}`)

            console.log("\n=== POLLING TIME (ms) ===")
            console.log(`Min time: ${timeStats.min}`)
            console.log(`Max time: ${timeStats.max}`)
            console.log(`Average time: ${timeStats.avg.toFixed(2)}`)
            console.log(`Median time: ${timeStats.median}`)
            console.log(`Mode time: ${timeStats.mode}`)
            console.log(`90th percentile: ${timeStats.p90}`)
            console.log(`95th percentile: ${timeStats.p95}`)
        } else {
            console.log("\n=== POLLING STATISTICS ===")
            console.log("No successful polls to analyze")
        }
    } catch (error) {
        console.error("Stress test failed:", error)
        process.exit(1)
    }

    process.exit(0)
}

main()
