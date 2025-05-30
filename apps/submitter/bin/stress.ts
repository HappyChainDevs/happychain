import { BoopClient, CreateAccount, computeBoopHash } from "@happy.tech/boop-sdk"
import { delayed, stringify } from "@happy.tech/common"
import { type PrivateKeyAccount, generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createAndSignMintBoop } from "#lib/utils/test/helpers" // Ensure this is correctly pathed

type RunSummary = {
    runId: string
    account?: string
    eoaAddress: string
    accountCreationTimeMs: number
    accountCreationStatus: string // e.g., CreateAccount.Success or error message
    boopsAttempted: number
    boopsSuccessful: number
    boopsFailedStatus: number
    boopsNonResponseError: number
    latencies: number[]
    averageLatencyMs: number
    stdDevLatencyMs: number
    avgAbsDevLatencyMs: number
    totalDurationMs: number
    error?: string // For critical errors during the run
}

/**
 * Runs a single test sequence for one account.
 */
async function run({
    eoa = privateKeyToAccount(generatePrivateKey()),
    numBoops = 80,
    runId = "Run",
}: { eoa?: PrivateKeyAccount; numBoops?: number; runId?: string }): Promise<RunSummary> {
    console.log(`[${runId}] Config: RPC URL: ${process.env.RPC_HTTP_URL}, Submitter URL: ${process.env.SUBMITTER_URL}`)
    const boopClient = new BoopClient({ rpcUrl: process.env.RPC_HTTP_URL, baseUrl: process.env.SUBMITTER_URL })

    const overallStartTime = performance.now()
    let accountAddress: string | undefined = undefined
    let accountCreationTime = 0
    let accountStatus = "Not Attempted"

    // Default summary structure for early exit or error
    const baseSummary = {
        runId,
        eoaAddress: eoa.address,
        boopsAttempted: numBoops,
        boopsSuccessful: 0,
        boopsFailedStatus: 0,
        boopsNonResponseError: 0,
        latencies: [],
        averageLatencyMs: 0,
        stdDevLatencyMs: 0,
        avgAbsDevLatencyMs: 0,
    }

    try {
        // Step 1: Create account
        console.log(`[${runId}] Creating test account for owner ${eoa.address}...`)
        const startAccountCreate = performance.now()
        // Generate a unique salt for each account to ensure distinctness
        const saltForAccount = `0x${Buffer.from(`${runId}-${eoa.address}-${Date.now()}`).toString("hex").slice(0, 64).padStart(64, "0")}`
        const createAccountResult = await boopClient.createAccount({
            owner: eoa.address,
            salt: saltForAccount as `0x${string}`,
        })
        accountCreationTime = performance.now() - startAccountCreate

        if (createAccountResult.status !== CreateAccount.Success) {
            accountStatus = `Failed: ${stringify(createAccountResult)}`
            console.error(`[${runId}] Account creation failed: ${accountStatus}`)
            return {
                ...baseSummary,
                accountCreationTimeMs: Math.round(accountCreationTime),
                accountCreationStatus: accountStatus,
                totalDurationMs: Math.round(performance.now() - overallStartTime),
                error: "Account creation failed",
            }
        }
        accountAddress = createAccountResult.address
        accountStatus = CreateAccount.Success as string
        console.log(`[${runId}] Account created: ${accountAddress} in ${accountCreationTime.toFixed(2)}ms`)

        if (numBoops === 0) {
            return {
                ...baseSummary,
                account: accountAddress,
                accountCreationTimeMs: Math.round(accountCreationTime),
                accountCreationStatus: accountStatus,
                boopsAttempted: 0, // Explicitly 0
                totalDurationMs: Math.round(performance.now() - overallStartTime),
            }
        }

        const delayBetweenTransactions = 200
        const results: { Latency: number; Status: string; EvmTxHash: string; Nonce: bigint }[] = []
        const boopPromises: Promise<void>[] = []

        console.log(
            `[${runId}] Initiating ${numBoops} transactions for account ${accountAddress} with ${delayBetweenTransactions}ms delay...`,
        )
        for (let i = 0; i < numBoops; i++) {
            const nonceValue = BigInt(i) % 50n // Example: 0-49 for each track
            const nonceTrack = BigInt(Math.floor(i / 50)) // Example: 0 for i=0..49, 1 for i=50..99

            const tx = await createAndSignMintBoop(eoa, {
                account: accountAddress as `0x${string}`,
                nonceTrack,
                nonceValue,
            })

            boopPromises.push(
                delayed(i * delayBetweenTransactions, async () => {
                    const start = performance.now()
                    let currentStatus = "Unknown"
                    let currentEvmTxHash = "N/A"
                    const boopHash = computeBoopHash(216n, tx)
                    const boopIdentifier = `(account ${accountAddress}, nonceTrack ${nonceTrack}, nonceValue ${nonceValue} — ${boopHash.slice(0, 10)}...)`

                    try {
                        const { status, receipt, description } = await boopClient.execute({ boop: tx })
                        currentStatus = status
                        if (receipt?.evmTxHash) {
                            currentEvmTxHash = receipt.evmTxHash
                            // console.log(`[${runId}] Success ${boopIdentifier}: ${currentEvmTxHash}`); // Can be very verbose
                        } else {
                            console.warn(
                                `[${runId}] Boop issue ${boopIdentifier}: Status: ${currentStatus}, Description: ${description || "No description"}`,
                            )
                        }
                    } catch (error) {
                        console.error(`[${runId}] Non-response error ${boopIdentifier}: ${stringify(error)}`)
                        currentStatus = "Non-Response Error"
                    } finally {
                        const end = performance.now()
                        results.push({
                            Latency: Math.round(end - start),
                            Status: currentStatus,
                            EvmTxHash: currentEvmTxHash,
                            Nonce: nonceTrack * 100n + nonceValue, // Unique nonce for sorting
                        })
                    }
                }),
            )
        }

        console.log(
            `[${runId}] All ${numBoops} transaction initiations complete for ${accountAddress}. Waiting for network responses...`,
        )
        await Promise.all(boopPromises)
        console.log(`[${runId}] All transactions processed for ${accountAddress}.`)

        const latencies = results.map((r) => r.Latency)
        const successfulBoops = results.filter((r) => r.EvmTxHash !== "N/A").length
        const nonResponseErrorBoops = results.filter((r) => r.Status === "Non-Response Error").length
        const failedStatusBoops = results.length - successfulBoops - nonResponseErrorBoops

        let averageLatencyMs = 0
        let stdDevLatencyMs = 0
        let avgAbsDevLatencyMs = 0

        if (latencies.length > 0) {
            averageLatencyMs = latencies.reduce((sum, l) => sum + l, 0) / latencies.length
            const variance = latencies.reduce((sum, l) => sum + (l - averageLatencyMs) ** 2, 0) / latencies.length
            stdDevLatencyMs = Math.sqrt(variance)
            avgAbsDevLatencyMs =
                latencies.reduce((sum, l) => sum + Math.abs(l - averageLatencyMs), 0) / latencies.length
        }

        // Optionally, print per-run table if needed, but can be verbose
        // console.log(`\n--- [${runId}] Transaction Table for Account ${accountAddress} ---`);
        // console.table(results.sort((a, b) => Number(a.Nonce - b.Nonce)));

        console.log(
            `[${runId}] Account ${accountAddress} Summary: Avg Latency: ${averageLatencyMs.toFixed(2)}ms, Successful Boops: ${successfulBoops}/${numBoops}`,
        )

        return {
            ...baseSummary,
            account: accountAddress,
            accountCreationTimeMs: Math.round(accountCreationTime),
            accountCreationStatus: accountStatus,
            boopsSuccessful: successfulBoops,
            boopsFailedStatus: failedStatusBoops,
            boopsNonResponseError: nonResponseErrorBoops,
            latencies,
            averageLatencyMs: Number.parseFloat(averageLatencyMs.toFixed(2)),
            stdDevLatencyMs: Number.parseFloat(stdDevLatencyMs.toFixed(2)),
            avgAbsDevLatencyMs: Number.parseFloat(avgAbsDevLatencyMs.toFixed(2)),
            totalDurationMs: Math.round(performance.now() - overallStartTime),
        }
    } catch (criticalError) {
        console.error(`[${runId}] Critical error during run: ${stringify(criticalError)}`)
        return {
            ...baseSummary,
            account: accountAddress, // Might be undefined if error before creation
            accountCreationTimeMs: Math.round(accountCreationTime), // Could be 0 if error before creation
            accountCreationStatus:
                accountStatus === "Not Attempted" || accountStatus === (CreateAccount.Success as string)
                    ? accountStatus
                    : `Failed: ${accountStatus}`,
            totalDurationMs: Math.round(performance.now() - overallStartTime),
            error: stringify(criticalError),
        }
    }
}

/**
 * Main orchestrator for running multiple test sequences in parallel.
 */
async function stressTest({ numConcurrentRuns = 10, numBoopsPerRun = 80 } = {}) {
    console.log(
        `\n🚀 Starting stress test: ${numConcurrentRuns} concurrent account(s), each sending ${numBoopsPerRun} Boops.`,
    )
    const runPromises: Promise<RunSummary>[] = []

    for (let i = 0; i < numConcurrentRuns; i++) {
        const eoa = privateKeyToAccount(generatePrivateKey())
        const runId = `StressRun-${i + 1}`
        runPromises.push(run({ eoa, numBoops: numBoopsPerRun, runId }))
    }

    const settledResults = await Promise.allSettled(runPromises)

    console.log("\n--- Stress Test Summary ---")
    const allRunSummaries: RunSummary[] = []
    let totalBoopsAttemptedAllRuns = 0
    let totalBoopsSuccessfulAllRuns = 0
    let totalBoopsFailedStatusAllRuns = 0
    let totalBoopsNonResponseErrorAllRuns = 0
    const combinedLatencies: number[] = []

    settledResults.forEach((settledResult, index) => {
        const runId = `StressRun-${index + 1}` // Match runId used
        if (settledResult.status === "fulfilled") {
            const summary = settledResult.value
            allRunSummaries.push(summary)
            console.log(`\n✅ [${summary.runId}] Completed.`)
            console.log(`  Account: ${summary.account || "N/A"} (Owner EOA: ${summary.eoaAddress})`)
            console.log(`  Account Creation: ${summary.accountCreationStatus} in ${summary.accountCreationTimeMs}ms`)

            if (summary.error && summary.accountCreationStatus !== CreateAccount.Success) {
                console.log(`  Run Error (Account Creation): ${summary.error}`)
            } else if (summary.error) {
                console.log(`  Run Error (General): ${summary.error}`)
            }

            if (summary.boopsAttempted > 0 && summary.accountCreationStatus === CreateAccount.Success) {
                console.log(
                    `  Boops: ${summary.boopsSuccessful} successful, ${summary.boopsFailedStatus} failed (status), ${summary.boopsNonResponseError} failed (error) / ${summary.boopsAttempted} attempted.`,
                )
                console.log(`  Latency (avg): ${summary.averageLatencyMs}ms, (stdDev): ${summary.stdDevLatencyMs}ms`)
                totalBoopsSuccessfulAllRuns += summary.boopsSuccessful
                totalBoopsFailedStatusAllRuns += summary.boopsFailedStatus
                totalBoopsNonResponseErrorAllRuns += summary.boopsNonResponseError
                if (summary.latencies) combinedLatencies.push(...summary.latencies)
            } else if (summary.boopsAttempted === 0) {
                console.log("  Boops: 0 attempted (as configured).")
            }
            totalBoopsAttemptedAllRuns += summary.boopsAttempted
            console.log(`  Total duration for this run: ${summary.totalDurationMs}ms`)
        } else {
            // This means 'run' itself threw an unhandled exception, which it shouldn't due to its internal try/catch.
            // Or the promise was rejected for other reasons.
            console.error(`\n❌ [${runId}] Failed catastrophically: ${stringify(settledResult.reason)}`)
            // Create a placeholder summary for failed runs
            allRunSummaries.push({
                runId,
                eoaAddress: "Unknown (run failed early)",
                accountCreationTimeMs: 0,
                accountCreationStatus: "Catastrophic Failure",
                boopsAttempted: numBoopsPerRun,
                boopsSuccessful: 0,
                boopsFailedStatus: 0,
                boopsNonResponseError: 0,
                latencies: [],
                averageLatencyMs: 0,
                stdDevLatencyMs: 0,
                avgAbsDevLatencyMs: 0,
                totalDurationMs: 0, // Or measure duration until failure if possible
                error: stringify(settledResult.reason),
            })
            totalBoopsAttemptedAllRuns += numBoopsPerRun // Count as attempted
        }
    })

    console.log("\n--- 🌐 Global Stress Test Aggregates ---")
    const successfulPhysicalRuns = settledResults.filter((r) => r.status === "fulfilled" && !r.value.error).length
    console.log(
        `Total Runs Initiated: ${numConcurrentRuns}, Completed without critical error: ${successfulPhysicalRuns}`,
    )
    console.log(`Total Boops Attempted (across all runs): ${totalBoopsAttemptedAllRuns}`)
    console.log(`Total Boops Successful (with receipt): ${totalBoopsSuccessfulAllRuns}`)
    console.log(`Total Boops Failed (server status/no receipt): ${totalBoopsFailedStatusAllRuns}`)
    console.log(`Total Boops Failed (non-response/client error): ${totalBoopsNonResponseErrorAllRuns}`)

    if (combinedLatencies.length > 0) {
        const globalAverageLatency = combinedLatencies.reduce((sum, l) => sum + l, 0) / combinedLatencies.length
        const globalVariance =
            combinedLatencies.reduce((sum, l) => sum + (l - globalAverageLatency) ** 2, 0) / combinedLatencies.length
        const globalStdDevLatency = Math.sqrt(globalVariance)
        console.log(`Global Average Latency (for all successful boops): ${globalAverageLatency.toFixed(2)}ms`)
        console.log(`Global Standard Deviation Latency: ${globalStdDevLatency.toFixed(2)}ms`)
    } else {
        console.log("No successful boop latencies recorded across all runs to calculate global average.")
    }
    const fullySuccessfulRuns = allRunSummaries.filter(
        (s) =>
            !s.error &&
            s.accountCreationStatus === CreateAccount.Success &&
            s.boopsAttempted > 0 &&
            s.boopsSuccessful === s.boopsAttempted,
    ).length
    const accountCreationSuccessRuns = allRunSummaries.filter(
        (s) => s.accountCreationStatus === CreateAccount.Success,
    ).length
    console.log(`Runs with successful account creation: ${accountCreationSuccessRuns} / ${numConcurrentRuns}`)
    console.log(
        `Runs where all boops were successful: ${fullySuccessfulRuns} / ${accountCreationSuccessRuns} (of those with successful account creation and >0 boops)`,
    )
}
;(async () => {
    try {
        if (!process.env.RPC_HTTP_URL || !process.env.SUBMITTER_URL) {
            console.error("Error: RPC_HTTP_URL and SUBMITTER_URL environment variables must be set.")
            process.exit(1)
        }
        await stressTest({ numConcurrentRuns: 100, numBoopsPerRun: 5 }) //change these numbers to increase the load
    } catch (e) {
        console.error("Critical unhandled error in stressTest orchestrator:", e)
        process.exit(1)
    }
    console.log("Stress test completed")
    process.exit(0)
})()
