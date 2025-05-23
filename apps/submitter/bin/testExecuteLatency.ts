import { BoopClient, type ExecuteOutput, type ExecuteSuccess, Onchain, computeBoopHash } from "@happy.tech/boop-sdk"
import { stringify } from "@happy.tech/common"
import { createAndSignMintTx, getNonce, testAccount } from "./utils"
// import { appendFileSync, existsSync, writeFileSync } from "node:fs";

// const CSV_FILE = "./submitter_fastlane.csv";

// if (!existsSync(CSV_FILE)) {
//     writeFileSync(CSV_FILE, "Latency (ms),Status,TxHash\n");
// }

/**
 * Runs the main test sequence, creating an account and sending multiple boop transactions concurrently.
 */
async function run() {
    const boopClient = new BoopClient()

    // Step 1: Create account (this remains serial)
    console.log("Creating test account...")
    const createAccountResult = await boopClient.createAccount({
        owner: testAccount.address,
        salt: "0x0000000000000000000000000000000000000000000000000000000000000001",
    })

    if (!("address" in createAccountResult)) {
        throw new Error("Account creation failed: " + stringify(createAccountResult))
    }
    console.log(`Account created: ${createAccountResult.address}`)

    const baseNonce = await getNonce(createAccountResult.address)
    const numTransactions = 50 // Number of transactions to send
    const delayBetweenTransactions = 1000 // milliseconds

    // Array to store results for console.table
    const results: { Latency: string; Status: string; TxHash: string }[] = []

    const transactionPromises: Promise<void>[] = []

    // Step 2: Initiate transactions with a controlled delay
    console.log(`Initiating ${numTransactions} transactions with a ${delayBetweenTransactions}ms delay between each...`)
    for (let i = 0; i < numTransactions; i++) {
        const currentNonce = baseNonce + BigInt(i)
        const tx = await createAndSignMintTx(createAccountResult.address, currentNonce)

        // Schedule the execution of each transaction
        const transactionExecutionPromise = new Promise<void>((resolve) => {
            setTimeout(async () => {
                const start = performance.now()
                let executeResult: ExecuteOutput | undefined
                let status = "Unknown"
                let txHash = "N/A"
                let computedBoopHash: string

                try {
                    computedBoopHash = computeBoopHash(216n, tx)

                    // console.log(`[TestLatency] Processing boop ${computedBoopHash} for nonce ${currentNonce}:`, JSON.stringify(tx, (key, value) =>
                    //     typeof value === 'bigint' ? value.toString() + 'n' : value
                    // ));

                    executeResult = await boopClient.execute({ boop: tx })
                    status = executeResult.status

                    if (executeResult.status === Onchain.Success) {
                        txHash = (executeResult as ExecuteSuccess).receipt.evmTxHash
                        console.log(
                            `Boop ${computedBoopHash} Success: https://explorer.testnet.happy.tech/tx/${txHash}`,
                        )
                    } else {
                        console.error(
                            `Execute not successful for boop ${computedBoopHash}: ${stringify(executeResult)}`,
                        )
                    }
                } catch (error) {
                    console.error(`Error executing boop (nonce ${currentNonce}): ${stringify(error)}`)
                    status = "Error"
                    // If error, txHash remains 'N/A'
                } finally {
                    const end = performance.now()
                    const latency = (end - start).toFixed(2)
                    // Store data in the array
                    results.push({ Latency: latency, Status: status, TxHash: txHash })
                    resolve() // Resolve this individual promise
                }
            }, i * delayBetweenTransactions) // Delay each transaction initiation
        })
        transactionPromises.push(transactionExecutionPromise)
    }

    // Step 3: Wait for all initiated transactions to complete
    console.log("All transactions initiated. Waiting for all to complete...")
    await Promise.all(transactionPromises)
    console.log("All transactions completed.")

    // Display results in a console table
    console.log("\n--- Transaction Latency Results ---")
    console.table(results)
}

run()
    .then(() => {
        console.log("Script finished successfully.")
    })
    .catch((error) => {
        console.error("Script failed:", error)
        process.exit(1) // Exit with an error code
    })
