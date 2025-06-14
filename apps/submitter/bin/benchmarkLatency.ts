import { BoopClient, CreateAccount, computeBoopHash } from "@happy.tech/boop-sdk"
import { delayed, stringify } from "@happy.tech/common"
import { type PrivateKeyAccount, generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createAndSignMintBoop } from "#lib/utils/test/helpers" // no barrel import: don't start services

/**
 * Runs the main test sequence, creating an account and sending multiple boop transactions concurrently.
 */
async function run({
    eoa = privateKeyToAccount(generatePrivateKey()),
    numBoops = 80,
}: { eoa?: PrivateKeyAccount; numBoops?: number } = {}) {
    const boopClient = new BoopClient({
        rpcUrl: process.env.RPC_HTTP_URLS?.split(",").map((a) => a.trim())[0],
        submitterUrl: process.env.SUBMITTER_URL,
    })

    // Step 1: Create account (this remains serial)
    console.log("Creating test account...")
    const start = performance.now()
    const createAccountResult = await boopClient.createAccount({
        owner: eoa.address,
        salt: "0x0000000000000000000000000000000000000000000000000000000000000001",
    })
    if (createAccountResult.status !== CreateAccount.Success)
        throw new Error("Account creation failed: " + stringify(createAccountResult))
    const account = createAccountResult.address
    console.log(`Account created: ${account} in ${performance.now() - start}`)
    if (numBoops === 0) return
    // 80 boops spaced 50ms = consistently spaced sending for 4 seconds
    const delayBetweenTransactions = 50
    // Array to store results for console.table
    const results: { Latency: number; Status: string; EvmTxHash: string; Nonce: bigint }[] = []
    const boopPromises: Promise<void>[] = []

    // Step 2: Initiate transactions with a controlled delay
    console.log(`Initiating ${numBoops} transactions with a ${delayBetweenTransactions}ms delay between each...`)
    for (let i = 0; i < numBoops; i++) {
        const nonceValue = BigInt(i) % 50n
        const nonceTrack = i < 50 ? 0n : 1n
        const tx = await createAndSignMintBoop(eoa, { account, nonceTrack, nonceValue })
        boopPromises[i] = delayed(i * delayBetweenTransactions, async (): Promise<void> => {
            const start = performance.now()
            let Status = "Unknown"
            let EvmTxHash = "N/A"
            const boopHash = computeBoopHash(216n, tx)
            const stringBoop = `(nonce ${nonceValue} — ${boopHash})`
            try {
                const { status, receipt, error } = await boopClient.execute({ boop: tx })
                Status = status
                if (receipt) {
                    EvmTxHash = receipt.evmTxHash
                    console.log(`Success ${stringBoop}: https://explorer.testnet.happy.tech/tx/${EvmTxHash}`)
                } else {
                    console.error(`Error ${stringBoop}: ${error}`)
                }
            } catch (error) {
                console.error(`Non-response error ${stringBoop}: ${stringify(error)} — THIS SHOULD NOT HAPPEN`)
                Status = "Non-Response Error"
            } finally {
                const end = performance.now()
                results.push({
                    Latency: Math.round(end - start),
                    Status,
                    EvmTxHash,
                    Nonce: nonceTrack * 100n + nonceValue,
                })
            }
        })
    }

    // Step 3: Wait for all initiated transactions to complete
    console.log("All transactions initiated. Waiting for all to complete...")
    await Promise.all(boopPromises)
    console.log("All transactions completed.")

    // Display results in a console table
    console.log("\n--- Transaction Latency Results ---")
    console.table(results.sort((a, b) => Number(a.Nonce - b.Nonce)))
    const average = results.reduce((sum, r) => sum + r.Latency, 0) / results.length
    const variance = results.reduce((sum, r) => sum + (r.Latency - average) ** 2, 0) / results.length
    const stdDeviation = Math.sqrt(variance)
    const avgDeviation = results.reduce((sum, r) => sum + Math.abs(r.Latency - average), 0) / results.length
    console.log(`Average: ${average}`)
    console.log(`Average Deviation: ${avgDeviation}`)
    console.log(`Standard Deviation: ${stdDeviation}`)
}

// // Uncomment to benchmark account creation latency.
// for (let i = 0; i < 10; i++) {
//     await run({ numBoops: 0 })
// }

await run()
console.log("done")
process.exit(0)
