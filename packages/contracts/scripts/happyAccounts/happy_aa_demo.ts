import { type Address, parseEther } from "viem"
import { account } from "../utils/clients"

import type { CreateAccountResponse, SubmitHappyTxResponse } from "@happychain/submitter/utils/responseSchema"

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
async function createAccount(owner: Address, salt: string): Promise<CreateAccountResponse> {
    try {
        const response = await fetch("http://localhost:3000/create-account", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                owner,
                salt,
                initData: "0x", // Add any initialization data if needed
            }),
        })

        if (!response.ok) {
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
        const salt = "0x" + "00".repeat(32) // Example salt
        const createAccountResult = await createAccount(account.address, salt)
        console.log("Created account:", createAccountResult)

        if (createAccountResult.success) {
            // Submit a transaction from the new account
            const submitTxResult = await submitHappyTx(
                createAccountResult.accountAddress,
                "0x1234567890123456789012345678901234567890", // Example target address
                parseEther("0.1"), // Example value
                "0x", // Example calldata
                BigInt(30000000000), // maxFeePerGas (30 gwei)
                BigInt(2000000000), // maxPriorityFeePerGas (2 gwei)
                BigInt(1000000000), // submitterFee (1 gwei)
            )
            console.log("Submitted transaction:", submitTxResult)
        }
    } catch (error) {
        console.error("Error in demo:", error)
    }
}

main().then(() => {
    process.exit(0)
})
