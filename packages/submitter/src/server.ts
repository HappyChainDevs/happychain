import type { Address } from "viem"

import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { prettyJSON } from "hono/pretty-json"

import { abis, deployment } from "@happychain/contracts/happyAccounts/anvil"
import { account, publicClient, walletClient } from "./utils/clients"
import { isContractDeployed } from "./utils/helpers"
import { DeployAccountSchema, HappyTxSchema } from "./utils/requestSchema"

const app = new Hono()

app.use(prettyJSON())
app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404))

// Routes
app.post("/deployAccount", zValidator("json", DeployAccountSchema), async (c) => {
    const { owner, salt } = c.req.valid("json")
    console.log("\n###########################################\n")
    console.log(`/deployAccount\nOwner: ${owner},\nSalt: ${salt}`)

    try {
        // First predict the account address
        console.log("\nPredicting account address...")
        const predictedAddress: Address = await publicClient.readContract({
            address: deployment.ScrappyAccountFactory,
            abi: abis.ScrappyAccountFactory,
            functionName: "getAddress",
            args: [salt],
        })

        // Check if code already exists at the predicted address
        const alreadyDeployed = await isContractDeployed(predictedAddress)

        if (alreadyDeployed) {
            console.log("Account already deployed at:", predictedAddress)
            return c.json({
                success: true,
                message: "Account already exists at this address",
                accountAddress: predictedAddress,
                owner,
                alreadyDeployed: true,
            })
        }

        // If not deployed, simulate the deployment
        console.log("\nSimulating deployment...")
        const { request, result } = await publicClient.simulateContract({
            address: deployment.ScrappyAccountFactory,
            abi: abis.ScrappyAccountFactory,
            functionName: "createAccount",
            args: [salt, owner],
            account,
        })

        // Check if the predicted address matches the result
        if (result !== predictedAddress) {
            console.error("Address mismatch during simulation")
            return c.json(
                {
                    success: false,
                    message: "Address mismatch",
                    predictedAddress,
                    result,
                },
                400,
            )
        }

        // Then, actually deploy
        console.log("\nCalling ScrappyAccountFactory...")
        const hash = await walletClient.writeContract(request)
        console.log("Tx Hash:", hash)

        console.log("\nWaiting for receipt...")
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        console.log("Tx Receipt:", receipt.status)

        if (receipt.status !== "success") {
            console.error("Deployment failed with receipt:", receipt)
            return c.json(
                {
                    success: false,
                    message: "Transaction failed on-chain",
                    receipt,
                },
                400,
            )
        }

        if (result !== predictedAddress) {
            console.error("Address mismatch")
            return c.json(
                {
                    success: false,
                    message: "Address mismatch",
                    predictedAddress,
                    result,
                },
                400,
            )
        }

        // Verify deployment
        console.log("\nVerifying deployment at predicted address...")
        const isDeployed = await isContractDeployed(predictedAddress)

        if (!isDeployed) {
            console.error("No code found at predicted address")
            return c.json(
                {
                    success: false,
                    message: "No code found at predicted address",
                    predictedAddress,
                },
                400,
            )
        }
        console.log("Deployment successful for owner:", owner)

        return c.json({
            success: true,
            message: "Account deployed successfully",
            accountAddress: predictedAddress,
            owner,
            transactionHash: hash,
        })
    } catch (error) {
        console.error("Error during account deployment:", error)
        return c.json(
            {
                success: false,
                message: "Deployment failed",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            500,
        )
    }
})

app.post("/submitHappyTx", zValidator("json", HappyTxSchema), async (c) => {
    const hash = "0xabcdabcd"

    return c.json({
        success: true,
        txHash: hash,
    })
})

export default app
