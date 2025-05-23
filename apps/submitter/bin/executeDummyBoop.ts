/**
 * This script is intended to be run as part of a cron job to test boop's on testnet.
 * It creates a new account, prepares a boop that mints a token, and calls execute on the Entrypoint.
 */

import { BoopClient, type ExecuteSuccess, Onchain } from "@happy.tech/boop-sdk"
import { stringify } from "@happy.tech/common"
import { createAndSignMintTx, getNonce, testAccount } from "./utils"

async function run() {
    const boopClient = new BoopClient()
    const createAccountResult = await boopClient.createAccount({
        owner: testAccount.address,
        salt: "0x0000000000000000000000000000000000000000000000000000000000000001",
    })

    if (!("address" in createAccountResult)) {
        throw new Error("Account creation failed: " + stringify(createAccountResult))
    }

    const tx = await createAndSignMintTx(createAccountResult.address, await getNonce(createAccountResult.address))
    const executeResult = await boopClient.execute({ boop: tx })

    if (executeResult.status !== Onchain.Success) {
        throw new Error(`execute not successful: ${stringify(executeResult)}`)
    }

    console.log(`Boop: https://explorer.testnet.happy.tech/tx/${(executeResult as ExecuteSuccess).receipt.evmTxHash}`)

    const receiptResult = await boopClient.waitForReceipt({
        boopHash: (executeResult as ExecuteSuccess).receipt.boopHash,
    })
    if (!("receipt" in receiptResult)) {
        throw new Error("Receipt not found: " + stringify(receiptResult))
    }
}

run().then(() => {
    console.log("done")
})
