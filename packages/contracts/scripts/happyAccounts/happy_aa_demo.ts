import { type Address, type Hex, keccak256 } from "viem"
import { account } from "../utils/clients"

import { type DeployAccountRequest, DeployAccountSchema } from "@happychain/submitter/utils/requestSchema"
import type { DeployAccountResponse, SubmitHappyTxResponse } from "@happychain/submitter/utils/responseSchema"

// interface CreateAccountResponse {
//   accountAddress: Address
//   factoryAddress: Address
//   success: boolean
// }

// interface SubmitHappyTxResponse {
//   txHash: string
//   success: boolean
// }

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
 * @param happyTx The transaction to submit
 * @returns The response containing the transaction hash
 */
async function submitHappyTx(
    sender: Address,
    target: Address,
    value: bigint,
    callData: string,
    maxFeePerGas: bigint,
    maxPriorityFeePerGas: bigint,
    submitterFee: bigint,
): Promise<SubmitHappyTxResponse> {
    try {
        const response = await fetch("http://localhost:3000/submit-tx", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                happyTx: {
                    sender,
                    dest: target,
                    value: value.toString(),
                    callData,
                    maxFeePerGas: maxFeePerGas.toString(),
                    maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
                    submitterFee: submitterFee.toString(),
                    validatorData: "0x", // Add validator data if needed
                    extraData: "0x", // Add extra data if needed
                },
            }),
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error("Error submitting transaction:", error)
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

    console.log("\n=== Preparing Happy Transaction ===")
    try {
        if (!deployedAccountAddress) {
            throw new Error("No deployed account address available")
        }

        // TODO: Implement happy tx submission using deployedAccountAddress
        console.log("⏳ Preparing transaction from account:", deployedAccountAddress)
    } catch (error) {
        console.log("❌ Error preparing happy transaction")
        console.log(`   ${error instanceof Error ? error.message : String(error)}`)
        process.exit(1)
    }
}

main().then(() => {
    process.exit(0)
})
