import {
    BoopClient,
    CreateAccount,
    type ExecuteSuccess,
    GetNonce,
    Onchain,
    computeBoopHash,
} from "@happy.tech/boop-sdk"
import { delayed, stringify } from "@happy.tech/common"
import { type PrivateKeyAccount, generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createAndSignMintBoop } from "#lib/utils/test"

/**
 * Runs the main test sequence, creating an account and sending multiple boop transactions concurrently.
 */
async function run({
    eoa = privateKeyToAccount(generatePrivateKey()),
    numBoops = 80,
}: { eoa?: PrivateKeyAccount; numBoops?: number } = {}) {
    const boopClient = new BoopClient({ rpcUrl: process.env.RPC_URL, baseUrl: process.env.SUBMITTER_URL })

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

    const nonceOutput = await boopClient.getNonce({ address: createAccountResult.address, nonceTrack: 0n })
    if (nonceOutput.status !== GetNonce.Success) throw new Error("couldn't fetch nonce")
    const baseNonce = nonceOutput.nonceValue
    // 80 boops spaced 50ms = consistently spaced sending for 4 seconds
    const delayBetweenTransactions = 50
    // Array to store results for console.table
    const results: { Latency: number; Status: string; EvmTxHash: string }[] = []
    const boopPromises: Promise<void>[] = []

    // Step 2: Initiate transactions with a controlled delay
    console.log(`Initiating ${numBoops} transactions with a ${delayBetweenTransactions}ms delay between each...`)
    for (let i = 0; i < numBoops; i++) {
        const nonceValue = baseNonce + BigInt(i)
        const tx = await createAndSignMintBoop(eoa, { account, nonceValue })
        boopPromises[i] = delayed(i * delayBetweenTransactions, async () => {
            const start = performance.now()
            let status = "Unknown"
            let evmTxHash = "N/A"
            try {
                const boopHash = computeBoopHash(216n, tx)
                const result = await boopClient.execute({ boop: tx })
                status = result.status
                if (result.status !== Onchain.Success) throw new Error(result.description)
                evmTxHash = (result as ExecuteSuccess).receipt.evmTxHash
                console.log(`Boop ${boopHash} Success: https://explorer.testnet.happy.tech/tx/${evmTxHash}`)
            } catch (error) {
                console.error(`Error executing boop (nonce ${nonceValue}): ${stringify(error)}`)
                status = "Error"
            } finally {
                const end = performance.now()
                const latency = Math.round(end - start)
                results.push({ Latency: latency, Status: status, EvmTxHash: evmTxHash })
            }
        })
    }

    // Step 3: Wait for all initiated transactions to complete
    console.log("All transactions initiated. Waiting for all to complete...")
    await Promise.all(boopPromises)
    console.log("All transactions completed.")

    // Display results in a console table
    console.log("\n--- Transaction Latency Results ---")
    console.table(results)
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
