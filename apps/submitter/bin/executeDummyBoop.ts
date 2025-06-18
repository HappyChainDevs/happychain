/**
 * This script is intended to be run as part of a cron job to test boop's on testnet.
 * It creates a new account, prepares a boop that mints a token, and calls execute on the Entrypoint.
 */

import { BoopClient, CreateAccount, type ExecuteSuccess, GetNonce, Onchain } from "@happy.tech/boop-sdk"
import { stringify } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createAndSignMintBoop } from "#lib/utils/test/helpers" // no barrel import to avoid starting services

if (process.env.SUBMITTER_URL === undefined) {
    throw new Error("SUBMITTER_URL is not defined. Please set it in your environment variables.")
}

async function run() {
    const eoa = privateKeyToAccount(generatePrivateKey())
    const boopClient = new BoopClient({
        submitterUrl: process.env.SUBMITTER_URL,
    })
    const createAccountResult = await boopClient.createAccount({
        owner: eoa.address,
        salt: "0x0000000000000000000000000000000000000000000000000000000000000001",
    })
    if (createAccountResult.status !== CreateAccount.Success)
        throw new Error("Account creation failed: " + stringify(createAccountResult))
    const account = createAccountResult.address

    const nonceResult = await boopClient.getNonce({ address: createAccountResult.address, nonceTrack: 0n })
    if (nonceResult.status !== GetNonce.Success) throw new Error(nonceResult.error)
    const nonceValue = nonceResult.nonceValue

    const boop = await createAndSignMintBoop(eoa, { account, nonceValue })

    const result = await boopClient.execute({ boop })
    if (result.status !== Onchain.Success) throw new Error(`execute failed: ${stringify(result)}`)
    console.log(`Boop: https://explorer.testnet.happy.tech/tx/${(result as ExecuteSuccess).receipt.evmTxHash}`)

    const receiptResult = await boopClient.waitForReceipt({ boopHash: result.receipt.boopHash })
    if (receiptResult.status !== Onchain.Success) throw new Error(`Receipt not found: ${stringify(receiptResult)}`)
}

await run()
console.log("done")
process.exit(0)
