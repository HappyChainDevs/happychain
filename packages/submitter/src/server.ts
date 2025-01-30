import { type Address, type Hex, parseEther, zeroAddress } from "viem"

import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { prettyJSON } from "hono/pretty-json"

import { abis, deployment } from "@happychain/contracts/happy-aa/anvil"
import { account, publicClient, walletClient } from "./utils/clients"
import { isContractDeployed } from "./utils/helpers"
import { DeployAccountSchema, HappyTxSchema } from "./utils/requestSchema"
import { DeployAccountResponseSchema, SubmitHappyTxResponseSchema } from "./utils/responseSchema"
import { localhost } from "viem/chains"

const app = new Hono()
app.use(prettyJSON())
app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404))

// Routes
app.get("/getAddress", async (c) => {
    const { salt } = c.req.query as { salt?: Hex }

    if (!salt) {
        return c.json({ success: false, message: "Salt is required" }, 400)
    }

    try {
        const predictedAddress: Address = await publicClient.readContract({
            address: deployment.ScrappyAccountFactory,
            abi: abis.ScrappyAccountFactory,
            functionName: "getAddress",
            args: [salt],
        })

        return c.json({ success: true, accountAddress: predictedAddress, message: "SCA fetched successfully" })
    } catch (error) {
        console.error("Error fetching predicted address:", error)
        return c.json(
            { success: false, accountAddress: zeroAddress, message: "Failed to fetch predicted address" },
            500,
        )
    }
})

app.post("/deployAccount", zValidator("json", DeployAccountSchema), async (c) => {
    const { owner, salt } = c.req.valid("json")
    console.log(`\n\n/deployAccount\nOwner: ${owner},\nSalt: ${salt}`)

    try {
        // First predict the account address
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
            const response = {
                success: false,
                error: `Account already exists at address ${predictedAddress}`,
            }
            const validatedResponse = DeployAccountResponseSchema.parse(response)
            return c.json(validatedResponse)
        }

        // If not deployed, simulate the deployment
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
            const response = {
                success: false,
                error: `Failed during simulation: Predicted address ${predictedAddress} does not match simulated address ${result}`,
            }
            const validatedResponse = DeployAccountResponseSchema.parse(response)
            return c.json(validatedResponse, 400)
        }

        // Then, actually deploy
        const hash = await walletClient.writeContract(request)
        console.log("Tx Hash:    ", hash)

        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        console.log("Tx Receipt: ", receipt.status)

        if (receipt.status !== "success") {
            console.error("Deployment failed with receipt:", receipt)
            const response = {
                success: false,
                transactionHash: receipt.transactionHash,
                error: "Transaction failed on-chain.",
            }
            const validatedResponse = DeployAccountResponseSchema.parse(response)
            return c.json(validatedResponse, 400)
        }

        if (result !== predictedAddress) {
            console.error("Address mismatch")
            const response = {
                success: false,
                transactionHash: receipt.transactionHash,
                error: `Predicted address ${predictedAddress} does not match deployed address ${result}`,
            }
            const validatedResponse = DeployAccountResponseSchema.parse(response)
            return c.json(validatedResponse, 400)
        }

        // Verify deployment
        const isDeployed = await isContractDeployed(predictedAddress)

        if (!isDeployed) {
            console.error("No code found at predicted address")
            const response = {
                success: false,
                transactionHash: receipt.transactionHash,
                error: `Contract deployment failed: No code found at ${predictedAddress}`,
            }
            const validatedResponse = DeployAccountResponseSchema.parse(response)
            return c.json(validatedResponse, 400)
        }

        await publicClient.waitForTransactionReceipt({
            hash: await walletClient.sendTransaction({
                account,
                to: predictedAddress,
                value: parseEther("1"),
                data: "0x",
                chain: localhost,
            }),
        })
        const balance = await publicClient.getBalance({ address: predictedAddress })
        console.log("💸 Top up Balance:", balance)

        const response = {
            success: true,
            message: "Account deployed successfully",
            accountAddress: predictedAddress,
            owner,
            transactionHash: hash,
        }
        const validatedResponse = DeployAccountResponseSchema.parse(response)
        return c.json(validatedResponse)
    } catch (error) {
        console.error("Error during account deployment:", error)
        const response = {
            success: false,
            error: error instanceof Error ? error.message : `Unknown error: ${error}`,
        }
        const validatedResponse = DeployAccountResponseSchema.parse(response)
        return c.json(validatedResponse, 500)
    }
})

app.post("/submitHappyTx", zValidator("json", HappyTxSchema), async (c) => {
    try {
        const { encodedHappyTx } = c.req.valid("json")
        console.log(`\n\n/submitHappyTx\nencodedHappyTx: ${encodedHappyTx}`)

        console.log("⏳ Simulating the transaction...")
        // Simulate the transaction first
        const { request } = await publicClient.simulateContract({
            address: deployment.HappyEntryPoint,
            abi: abis.HappyEntryPoint,
            functionName: "submit",
            args: [encodedHappyTx],
            account,
        })

        console.log("✅ Transaction simulation successful.")

        console.log("⏳ Sending the transaction...")
        // Send the transaction
        const hash = await walletClient.writeContract(request)
        console.log("✅ Transaction submitted successfully: ", hash)
        // console.log("⏳ Submitting the transaction...")
        // const hash = await walletClient.writeContract({
        //     address: deployment.HappyEntryPoint,
        //     abi: abis.HappyEntryPoint,
        //     functionName: "submit",
        //     args: [encodedHappyTx],
        //     account,
        //     chain: localhost,
        // })
        // console.log("Submitted happyTx: ", hash)

        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        if (receipt.status !== "success") {
            console.error("Transaction failed with receipt:", receipt)
            const response = {
                success: false,
                error: "Transaction failed on-chain.",
                txHash: receipt.transactionHash,
            }
            const validatedResponse = SubmitHappyTxResponseSchema.parse(response)
            return c.json(validatedResponse, 400)
        }

        const response = {
            success: true,
            message: "Tx submitted successfully",
            txHash: hash,
        }
        const validatedResponse = SubmitHappyTxResponseSchema.parse(response)
        return c.json(validatedResponse)
    } catch (error) {
        console.error("❌ Error submitting happy transaction.\n")
        const response = {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error during transaction submission",
        }
        const validatedResponse = SubmitHappyTxResponseSchema.parse(response)
        return c.json(validatedResponse, 500)
    }
})

export default app
