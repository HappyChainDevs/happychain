import { encodeFunctionData, keccak256, parseEther } from "viem"
import type { Address, Hex } from "viem"

import { type DeployAccountRequest, DeployAccountSchema } from "@happychain/submitter/utils/requestSchema"
import type { DeployAccountResponse, SubmitHappyTxResponse } from "@happychain/submitter/utils/responseSchema"

import { encode } from "./lib/happyTxLib"
import type { HappyTx } from "./types/happyTx"

import { abis } from "../../deployments/anvil/happy-aa/abis"
import { abis as mockAbis, deployment as mockDeployment } from "../../deployments/anvil/mocks/abis"

import { getRandomAddress } from "../utils/accounts"
import { account, publicClient } from "../utils/clients"

/**
 * Creates a new HappyAccount through the submitter service
 * @param owner The address that will own the new account
 * @param salt A unique value to determine the account address
 * @returns The response containing the new account address
 */
async function createAccount(owner: Address, salt: Hex): Promise<DeployAccountResponse> {
    try {
        // Create the request body
        const requestBody: DeployAccountRequest = {
            owner,
            salt,
        }

        // Validate the request body against the schema
        const validationResult = DeployAccountSchema.safeParse(requestBody)
        if (!validationResult.success) {
            console.error("Invalid request body:", validationResult.error)
            throw new Error("Invalid request data")
        }

        const response = await fetch("http://localhost:3000/deployAccount", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(validationResult.data),
        })

        if (!response.ok) {
            console.log("Create account response: ", response)
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error("Error creating account:", error)
        throw error
    }
}

/**
 * Submits a HappyTx through the submitter service
 * @param sender The address that will submit the transaction
 * @param encodedHappyTx The encoded happy transaction
 * @returns The response containing the transaction hash
 */
async function submitHappyTx(encodedHappyTx: Hex): Promise<SubmitHappyTxResponse> {
    try {
        // Create the request body with proper JSON serialization
        const requestBody = {
            encodedHappyTx: encodedHappyTx.toString(),
        }

        const response = await fetch("http://localhost:3000/submitHappyTx", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
            console.log("Create account response: ", response)
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error("Error submitting happyTx:", error)
        throw error
    }
}

async function main() {
    let deployedAccountAddress: Address | undefined

    console.log("\n=== Deploying Account ===")
    try {
        const salt: Hex = keccak256(Uint8Array.from(Buffer.from(Date.now().toString())))
        const result: DeployAccountResponse = await createAccount(account.address, salt)

        if (result.success) {
            deployedAccountAddress = result.accountAddress
            console.log("✅ Account deployed successfully")
            console.log(`   Owner: ${result.owner}`)
            console.log(`   Account Address: ${result.accountAddress}`)
            console.log(`   Transaction Hash: ${result.transactionHash}`)
        } else {
            console.log("❌ Account deployment failed")
            console.log(`   Error: ${result.error}`)
            if (result.transactionHash) {
                console.log(`   Failed Transaction: ${result.transactionHash}`)
            }
            process.exit(1)
        }
    } catch (error) {
        console.log("❌ Unexpected error during account deployment")
        console.log(`   ${error instanceof Error ? error.message : String(error)}`)
        process.exit(1)
    }

    console.log("\n=== Submitting Happy Transaction ===")
    try {
        if (!deployedAccountAddress) {
            throw new Error("No deployed account address available")
        }

        const nonce = await publicClient.readContract({
            address: deployedAccountAddress,
            abi: abis.ScrappyAccount,
            functionName: "getNonce",
        })
        console.log("\nNonce: ", nonce, "\n")

        // Create a dummy happy transaction for testing
        const dummyHappyTx: HappyTx = {
            account: deployedAccountAddress,
            dest: mockDeployment.MockTokenA,
            nonce,
            value: 0n,
            paymaster: deployedAccountAddress, // self funding
            gasLimit: 4000000000n,
            executeGasLimit: 4000000000n,
            submitterFee: 4000000000n,
            maxFeePerGas: await publicClient.estimateMaxPriorityFeePerGas(),
            callData: encodeFunctionData({
                abi: mockAbis.MockTokenA,
                functionName: "mint",
                args: [getRandomAddress(), parseEther("0.001")],
            }),
            paymasterData: "0x",
            validatorData: "0x",
            extraData: "0x", // Keep this field empty
        }

        // Encode the happy transaction
        const happyTxHash = keccak256(encode(dummyHappyTx))
        dummyHappyTx.extraData = await account.signMessage({
            message: {raw: happyTxHash},
        })
        const encodedHappyTx: Hex = encode(dummyHappyTx)
        
        console.log("Happy Tx: ", dummyHappyTx)
        console.log("⏳ Submitting transaction...")
        const result: SubmitHappyTxResponse = await submitHappyTx(encodedHappyTx)

        if (result.success) {
            console.log("✅ Transaction submitted successfully")
            console.log(`   Transaction Hash: ${result.txHash}`)
            console.log(`   Message: ${result.message}`)
        } else {
            console.log("❌ Transaction submission failed")
            if (result.txHash) {
                console.log(`   Failed Transaction: ${result.txHash}`)
            }
            console.log(`   Error: ${result.error}`)
            process.exit(1)
        }
    } catch (error) {
        console.log("❌ Error submitting happy transaction")
        console.log(`   ${error instanceof Error ? error.message : String(error)}`)
        process.exit(1)
    }
}

main().then(() => {
    process.exit(0)
})
