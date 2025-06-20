/**
 * Stress test for the simulate endpoint.
 * Sends multiple concurrent requests to simulate boops and measures performance.
 */

import { BoopClient, CreateAccount } from "@happy.tech/boop-sdk"
import { stringify } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createAndSignMintBoop } from "#lib/utils/test/helpers" // no barrel import: don't start services
import { endNonceMonitoring, startNonceMonitoring, trackCreatedAccount } from "./utils/nonceMonitor"

// Configuration
const DEFAULT_CONFIG = {
    concurrentRequests: 1000,
    batchSize: 100,
    delayBetweenBatchesMs: 100,
    submitterUrl: "http://localhost:3001",
}

interface StressTestConfig {
    concurrentRequests: number
    batchSize: number
    delayBetweenBatchesMs: number
    submitterUrl: string
}

interface TestResult {
    success: boolean
    latencyMs: number
    status: string
    error?: string
}

/**
 * Run the stress test for simulate endpoint
 */
async function runStressTest(config: StressTestConfig = DEFAULT_CONFIG): Promise<void> {
    console.log(`
=== SIMULATE ENDPOINT STRESS TEST ===
Submitter URL: ${config.submitterUrl}
Concurrent Requests: ${config.concurrentRequests}
Batch Size: ${config.batchSize}
Delay Between Batches: ${config.delayBetweenBatchesMs}ms
===================================
`)

    // Start monitoring executor nonces
    await startNonceMonitoring()

    const boopClient = new BoopClient({
        submitterUrl: config.submitterUrl,
    })

    // First create an account to use for all simulation requests
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

    const results: TestResult[] = []
    const batches = Math.ceil(config.concurrentRequests / config.batchSize)

    console.log(`Executing ${batches} batches of ${config.batchSize} requests...`)

    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        const batchStart = performance.now()
        const batchPromises: Promise<void>[] = []

        const remainingRequests = Math.min(config.batchSize, config.concurrentRequests - batchIndex * config.batchSize)

        console.log(`Batch ${batchIndex + 1}/${batches}: Sending ${remainingRequests} requests...`)

        for (let i = 0; i < remainingRequests; i++) {
            batchPromises.push(
                (async () => {
                    // Create a unique nonce for each request
                    const nonceValue = BigInt(batchIndex * config.batchSize + i)
                    const nonceTrack = 0n

                    try {
                        // Create and sign a boop for simulation
                        const boop = await createAndSignMintBoop(eoa, { account, nonceTrack, nonceValue })

                        const start = performance.now()
                        const result = await boopClient.simulate({ boop })

                        results.push({
                            success: result.status === "onchainSuccess",
                            latencyMs: Math.round(performance.now() - start),
                            status: result.status,
                        })
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

        await Promise.all(batchPromises)

        const batchDuration = performance.now() - batchStart
        console.log(`Batch ${batchIndex + 1} completed in ${Math.round(batchDuration)}ms`)

        // Add delay between batches if not the last batch
        if (batchIndex < batches - 1 && config.delayBetweenBatchesMs > 0) {
            console.log(`Waiting ${config.delayBetweenBatchesMs}ms before next batch...`)
            await new Promise((resolve) => setTimeout(resolve, config.delayBetweenBatchesMs))
        }
    }

    // Calculate and display statistics
    const successCount = results.filter((r) => r.success).length
    const failureCount = results.length - successCount
    const successRate = (successCount / results.length) * 100

    const latencies = results.filter((r) => r.latencyMs > 0).map((r) => r.latencyMs)

    if (latencies.length === 0) {
        console.log("\n=== RESULTS ===")
        console.log("No successful requests to measure latency")
        return
    }

    const avgLatency = latencies.reduce((sum, val) => sum + val, 0) / latencies.length
    const minLatency = Math.min(...latencies)
    const maxLatency = Math.max(...latencies)

    // Calculate percentiles
    latencies.sort((a, b) => a - b)
    const p50 = latencies[Math.floor(latencies.length * 0.5)]
    const p90 = latencies[Math.floor(latencies.length * 0.9)]
    const p95 = latencies[Math.floor(latencies.length * 0.95)]
    const p99 = latencies[Math.floor(latencies.length * 0.99)]

    console.log("\n=== RESULTS ===")
    console.log(`Total Requests: ${results.length}`)
    console.log(`Success: ${successCount} (${successRate.toFixed(2)}%)`)
    console.log(`Failures: ${failureCount}`)
    console.log("\n=== LATENCY (ms) ===")
    console.log(`Average: ${avgLatency.toFixed(2)}`)
    console.log(`Min: ${minLatency}`)
    console.log(`Max: ${maxLatency}`)
    console.log(`P50: ${p50}`)
    console.log(`P90: ${p90}`)
    console.log(`P95: ${p95}`)
    console.log(`P99: ${p99}`)

    // Display error distribution if there are failures
    if (failureCount > 0) {
        console.log("\n=== ERROR DISTRIBUTION ===")
        const errorGroups = results
            .filter((r) => !r.success)
            .reduce(
                (acc, curr) => {
                    const key = curr.status
                    if (!acc[key]) acc[key] = 0
                    acc[key]++
                    return acc
                },
                {} as Record<string, number>,
            )

        Object.entries(errorGroups).forEach(([status, count]) => {
            console.log(`${status}: ${count} (${((count / failureCount) * 100).toFixed(2)}%)`)
        })

        // Show a sample of errors
        console.log("\n=== SAMPLE ERRORS ===")
        results
            .filter((r) => !r.success)
            .slice(0, 3)
            .forEach((result, i) => {
                console.log(`Error ${i + 1}: ${result.error || result.status}`)
            })
    }

    // End nonce monitoring and show report
    await endNonceMonitoring()
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

// Main execution
async function main() {
    try {
        const config = parseArgs()
        await runStressTest(config)
    } catch (error) {
        console.error("Stress test failed:", error)
        process.exit(1)
    }

    process.exit(0)
}

main()
