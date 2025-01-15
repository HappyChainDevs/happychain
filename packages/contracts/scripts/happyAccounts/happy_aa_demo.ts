import type { Address, Hex } from "viem"
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
    try {
        // Create a new account
        const salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
        const createAccountResult = await createAccount(account.address, salt)
        console.log("Created account: ", createAccountResult)
    } catch (error) {
        console.error("Error in demo:", error)
    }
}

main().then(() => {
    process.exit(0)
})
