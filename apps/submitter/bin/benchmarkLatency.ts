import { BoopClient, CreateAccount, Onchain, SubmitterError, computeBoopHash } from "@happy.tech/boop-sdk"
import { delayed, sleep, stringify } from "@happy.tech/common"
import { type PrivateKeyAccount, generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createAndSignMintBoop } from "#lib/utils/test/helpers" // no barrel import: don't start services

type LatencyOptions = {
    eoa?: PrivateKeyAccount
    numBoops?: number
    delayBetweenTxs?: number
    timeout?: number
}

/**
 * Runs the main test sequence, creating an account and sending multiple boop transactions concurrently.
 */
export async function run({
    eoa = privateKeyToAccount(generatePrivateKey()),
    // 80 boops spaced 50ms = consistently spaced sending for 4 seconds
    numBoops = 80,
    delayBetweenTxs = 50,
    timeout = 60_000,
}: LatencyOptions = {}) {
    const boopClient = new BoopClient({
        rpcUrl: process.env.RPC_HTTP_URLS?.split(",").map((a) => a.trim())[0],
        submitterUrl: process.env.SUBMITTER_URL,
    })

    // Step 1: Create account (this remains serial)
    console.log("Creating test account...")
    let start = performance.now()
    const createAccountResult = await boopClient.createAccount({
        owner: eoa.address,
        salt: "0x0000000000000000000000000000000000000000000000000000000000000001",
    })
    if (createAccountResult.status !== CreateAccount.Success)
        throw new Error("Account creation failed: " + stringify(createAccountResult))
    const account = createAccountResult.address
    console.log(`Account created: ${account} in ${performance.now() - start}`)
    if (numBoops === 0) return

    // Array to store results for console.table
    const results: { Latency: number; Status: string; EvmTxHash: string; Nonce: bigint }[] = []
    const boopPromises: Promise<void>[] = []

    // Step 2: Initiate transactions with a controlled delay
    console.log(`Initiating ${numBoops} transactions with a ${delayBetweenTxs}ms delay between each...`)
    start = performance.now() - start
    for (let i = 0; i < numBoops; i++) {
        const nonceTrack = BigInt(i) / 50n
        const nonceValue = BigInt(i) % 50n
        const tx = await createAndSignMintBoop(eoa, { account, nonceTrack, nonceValue })
        boopPromises[i] = delayed(i * delayBetweenTxs, async (): Promise<void> => {
            const start = performance.now()
            let Status = "Unknown"
            let EvmTxHash = "N/A"
            const boopHash = computeBoopHash(216n, tx)
            const stringBoop = `(nonce ${nonceValue} — ${boopHash})`
            try {
                while (true) {
                    const { status, receipt, error } = await boopClient.execute({ boop: tx })
                    Status = status
                    if (receipt) {
                        EvmTxHash = receipt.evmTxHash
                        console.log(`Success ${stringBoop}: https://explorer.testnet.happy.tech/tx/${EvmTxHash}`)
                    } else if (status === SubmitterError.ClientError) {
                        continue // This sometimes happens when we spam — insist & retry =)
                    } else {
                        console.error(`Error ${stringBoop}: ${status} - ${error}`)
                    }
                    break
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
    await Promise.race([sleep(timeout), Promise.all(boopPromises)])
    const completionTime = performance.now() - start

    // Display results in a console table
    console.log("\n--- Transaction Latency Results ---")
    console.table(results.sort((a, b) => Number(a.Nonce - b.Nonce)))
    const average = results.reduce((sum, r) => sum + r.Latency, 0) / results.length
    const variance = results.reduce((sum, r) => sum + (r.Latency - average) ** 2, 0) / results.length
    const stdDeviation = Math.sqrt(variance)
    const avgDeviation = results.reduce((sum, r) => sum + Math.abs(r.Latency - average), 0) / results.length
    const successful = results.filter((it) => it.Status === Onchain.Success).length
    console.log(`Average: ${average}`)
    console.log(`Average Deviation: ${avgDeviation}`)
    console.log(`Standard Deviation: ${stdDeviation}`)
    console.log(`Total time: ${completionTime} (${delayBetweenTxs}ms between each submit, ${timeout}ms timeout)`)
    console.log(`Successful boops: ${successful}/${numBoops}`)
}

// No benchmark, but can be used to spam `createAccount` on the submitter.
export async function runAccounts(numAccounts: number) {
    const boopClient = new BoopClient({
        rpcUrl: process.env.RPC_HTTP_URLS?.split(",").map((a) => a.trim())[0],
        submitterUrl: process.env.SUBMITTER_URL,
    })
    const promises = []
    for (let i = 0; i < numAccounts; i++) {
        const account = privateKeyToAccount(generatePrivateKey())
        promises.push(
            boopClient.createAccount({
                owner: account.address,
                salt: "0x0000000000000000000000000000000000000000000000000000000000000001",
            }),
        )
    }
    const result = await Promise.allSettled(promises)
    console.log(result)
}

// Uncomment to spam submitter with createAccount.
// const start = performance.now()
// await runAccounts(500)
// console.log("finished in " + (performance.now() - start))

// Uncomment to benchmark account creation latency.
// for (let i = 0; i < 100; i++) {
//     await run({ numBoops: 0 })
// }

await run()
console.log("done")
process.exit(0)
