import { encodeAbiParameters, encodeFunctionData, keccak256, parseEther, zeroAddress } from "viem"
import type { Address, Hex } from "viem"

import { type DeployAccountRequest, DeployAccountSchema } from "@happychain/submitter/utils/requestSchema"
import type { DeployAccountResponse, SubmitHappyTxResponse } from "@happychain/submitter/utils/responseSchema"

import { encode } from "./lib/happyTxLib"
import type { HappyTx } from "./types/happyTx"

import { abis } from "../../deployments/anvil/happy-aa/abis"
import { abis as mockAbis, deployment as mockDeployment } from "../../deployments/anvil/mocks/abis"

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
            encodedHappyTx: encodedHappyTx,
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

async function getTokenBalance(address: Address) {
    return await publicClient.readContract({
        address: mockDeployment.MockTokenA,
        abi: mockAbis.MockTokenA,
        functionName: "balanceOf",
        args: [address],
    })
}

async function createDummyHappyTx(account: Address, nonce: bigint): Promise<HappyTx> {
    return {
        account,
        dest: mockDeployment.MockTokenA,
        nonce,
        value: 0n,
        paymaster: zeroAddress, // self funding
        gasLimit: 4000000000n,
        executeGasLimit: 4000000000n,
        submitterFee: 100n,
        maxFeePerGas: ((await publicClient.estimateMaxPriorityFeePerGas()) * 120n) / 100n,
        callData: encodeFunctionData({
            abi: mockAbis.MockTokenA,
            functionName: "mint",
            args: [account, parseEther("0.001")],
        }),
        paymasterData: "0x",
        validatorData: "0x",
        extraData: "0x",
    }
}

async function getNonce(account: Address): Promise<bigint> {
    return await publicClient.readContract({
        address: account,
        abi: abis.ScrappyAccount,
        functionName: "getNonce",
    })
}

function getHappyTxHash(happyTx: HappyTx) {
    const callData_hashed = keccak256(happyTx.callData)
    const paymasterData_hashed = keccak256(happyTx.paymasterData)
    const validatorData_hashed = keccak256(happyTx.validatorData)

    const abiEncoded = encodeAbiParameters(
        [
            // 'address', // account
            // 'uint256', // nonce
            // 'bytes32', // callData_hashed
            // 'uint256', // gasLimit
            // 'uint256', // executeGasLimit
            // 'address', // dest
            // 'address', // paymaster
            // 'uint256', // value
            // 'uint256', // maxFeePerGas
            // 'int256', // submitterFee
            // 'bytes32', // paymasterAndData_hashed
            // 'bytes32', // validatorAndData_hashed
            { type: "address" }, // account
            { type: "uint256" }, // nonce
            { type: "bytes32" }, // callData_hashed
            { type: "uint256" }, // gasLimit
            { type: "uint256" }, // executeGasLimit
            { type: "address" }, // dest
            { type: "address" }, // paymaster
            { type: "uint256" }, // value
            { type: "uint256" }, // maxFeePerGas
            { type: "int256" }, // submitterFee
            { type: "bytes32" }, // paymasterAndData_hashed
            { type: "bytes32" }, // validatorAndData_hashed
        ],
        [
            happyTx.account,
            happyTx.nonce,
            callData_hashed,
            happyTx.gasLimit,
            happyTx.executeGasLimit,
            happyTx.dest,
            happyTx.paymaster,
            happyTx.value,
            happyTx.maxFeePerGas,
            happyTx.submitterFee,
            paymasterData_hashed,
            validatorData_hashed,
        ],
    )

    const happyTxHash = keccak256(abiEncoded)
    console.log("abiEncoded: ", abiEncoded)
    console.log("Happy Tx Hash: ", happyTxHash)
    return happyTxHash
}

async function signHappyTx(happyTx: HappyTx): Promise<Hex> {
    const happyTxHash = getHappyTxHash(happyTx)
    return await account.signMessage({
        message: { raw: happyTxHash },
    })
}

async function main() {
    console.log("\n\n\x1b[1m\x1b[48;5;160m\x1b[38;5;88m=== Deploying Account ===\x1b[0m\n")
    let deployedAccountAddress: Address | undefined
    try {
        const salt: Hex = keccak256(Uint8Array.from(Buffer.from(Date.now().toString())))
        const result: DeployAccountResponse = await createAccount(account.address, salt)

        if (result.success) {
            deployedAccountAddress = result.accountAddress
            console.log("✅ Account deployed successfully")
            console.log(`   Owner: ${result.owner}`)
            console.log(`   Account Address: ${result.accountAddress}`)
            console.log(`   Transaction Hash: ${result.transactionHash}`)

            const initialBalance = await getTokenBalance(deployedAccountAddress)
            console.log(`\n\n\x1b[32m\x1b[48;5;40m\x1b[38;5;82m💸 Initial Balance: ${initialBalance} 💸\x1b[0m\n`)
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

    console.log("\n\n\x1b[1m\x1b[48;5;160m\x1b[38;5;88m=== Submitting Happy Transaction (self-paying) ===\x1b[0m\n")
    try {
        const dummyHappyTx = await createDummyHappyTx(deployedAccountAddress, await getNonce(deployedAccountAddress))
        dummyHappyTx.paymaster = deployedAccountAddress // self-paying
        dummyHappyTx.extraData = await signHappyTx(dummyHappyTx) // sign over the happyTx
        const encodedHappyTx: Hex = encode(dummyHappyTx)

        console.log("Happy Tx: ", dummyHappyTx)
        console.log("\n⏳ Submitting transaction...")
        const result: SubmitHappyTxResponse = await submitHappyTx(encodedHappyTx)

        if (result.success) {
            console.log("✅ Transaction submitted successfully")
            console.log(`   Transaction Hash: ${result.txHash}`)
            console.log(`   Message: ${result.message}`)

            const newBalance = await getTokenBalance(deployedAccountAddress)
            console.log(`\n\n\x1b[32m\x1b[48;5;40m\x1b[38;5;82m💸 New Balance: ${newBalance} 💸\x1b[0m\n`)
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

    console.log("\n\n\x1b[1m\x1b[48;5;160m\x1b[38;5;88m=== Submitting Happy Transaction (using paymaster) ===\x1b[0m\n")
    try {
        const dummyHappyTx = await createDummyHappyTx(deployedAccountAddress, await getNonce(deployedAccountAddress))
        dummyHappyTx.gasLimit = 0n // paymaster handles gas
        dummyHappyTx.executeGasLimit = 0n // paymaster handles gas
        dummyHappyTx.maxFeePerGas = 0n // paymaster handles gas
        dummyHappyTx.submitterFee = 0n // paymaster handles gas
        dummyHappyTx.extraData = await signHappyTx(dummyHappyTx) // sign over the happyTx

        console.log("Happy Tx: ", dummyHappyTx)
        console.log("\n⏳ Submitting transaction...")
        const encodedHappyTx: Hex = encode(dummyHappyTx)
        const result: SubmitHappyTxResponse = await submitHappyTx(encodedHappyTx)

        if (result.success) {
            console.log("✅ Transaction submitted successfully")
            console.log(`   Transaction Hash: ${result.txHash}`)
            console.log(`   Message: ${result.message}`)

            const newBalance = await getTokenBalance(deployedAccountAddress)
            console.log(`\n\n\x1b[32m\x1b[48;5;40m\x1b[38;5;82m💸 New Balance: ${newBalance} 💸\x1b[0m\n`)
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
