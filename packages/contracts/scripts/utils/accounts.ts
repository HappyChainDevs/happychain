import { type Address, encodeFunctionData, formatEther, numberToHex, parseEther } from "viem"
import { type UserOperationCall, entryPoint07Address } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts"
import { localhost } from "viem/chains"

import { abis, deployment } from "../../deployments/anvil/aa/abis"
import { abis as mockAbis, deployment as mockDeployment } from "../../deployments/anvil/mocks/abis"
import { account, publicClient, walletClient } from "./clients"

// Amount of ETH to mint/send in userOps in the demo.
export const AMOUNT = "0.01"
// Amount of ETH to deposit into paymasters/smart accounts for funding userOps (on Anvil).
export const DEPOSIT = parseEther("100")

export function getRandomAddress(): Address {
    return privateKeyToAddress(generatePrivateKey()).toString() as Address
}

export function toHexDigits(number: bigint, size: number): string {
    return numberToHex(number, { size }).slice(2)
}

/**
 * Send Eth to the deterministic address of a SCA.
 *
 * @param {Address} accountAddress - The address to send Eth to.
 * @return {Promise<"success" | "reverted">} - A promise that resolves with the transaction status.
 */
export async function fundSmartAccount(accountAddress: Address): Promise<"success" | "reverted"> {
    const txHash = await walletClient.sendTransaction({
        account: account,
        to: accountAddress,
        chain: localhost,
        value: DEPOSIT,
    })

    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
    })

    return receipt.status
}

/**
 * Deposit Eth to the EntryPoint contract on behalf of the HappyPaymaster, so it can sponsor userOps.
 *
 * @return {Promise<"success" | "reverted">} - A promise that resolves with the transaction status.
 */
export async function depositPaymaster(): Promise<"success" | "reverted"> {
    const txHash = await walletClient.writeContract({
        address: entryPoint07Address,
        abi: abis.EntryPointV7,
        functionName: "depositTo",
        args: [deployment.HappyPaymaster],
        value: DEPOSIT,
    })

    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
    })

    return receipt.status
}

/**
 * Mint mock tokens to initialize the MockToken contract's balanceOf[accountAddress] mapping's storage slot.
 *
 * @param {Address} accountAddress - The address to mint tokens for.
 * @return {Promise<"success" | "reverted">} - A promise that resolves with the transaction status.
 */
export async function initializeTokenBalance(accountAddress: Address): Promise<"success" | "reverted"> {
    const hash = await walletClient.writeContract({
        address: mockDeployment.MockTokenA,
        abi: mockAbis.MockTokenA,
        functionName: "mint",
        args: [accountAddress, DEPOSIT],
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return receipt.status
}

/**
 * Encode the callData field for userOps, used in the demo.
 *
 * @param {Address} [to] - The address to mint tokens for.
 * @return {UserOperationCall} - The encoded call data.
 */
export function createMintCall(to?: Address): UserOperationCall {
    return {
        to: mockDeployment.MockTokenA,
        value: 0n,
        data: encodeFunctionData({
            abi: mockAbis.MockTokenA,
            functionName: "mint",
            args: [to ?? getRandomAddress(), parseEther(AMOUNT)],
        }),
    }
}

/**
 * Get the balance of an address in unit of Eth.
 *
 * @param {Address} receiver - The address to get the balance for.
 * @return {Promise<string>} - A promise that resolves with the formatted balance.
 */
export async function getFormattedBalance(receiver: Address): Promise<string> {
    const balance = await publicClient.getBalance({
        address: receiver,
        blockTag: "latest",
    })

    return formatEther(balance)
}

/**
 * Get the token balance of an address in unit of Eth.
 *
 * @param {Address} address - The address to get the token balance for.
 * @return {Promise<string>} - A promise that resolves with the formatted token balance.
 */
export async function getFormattedTokenBalance(address: Address): Promise<string> {
    const balance = await publicClient.readContract({
        address: mockDeployment.MockTokenA,
        abi: mockAbis.MockTokenA,
        functionName: "balanceOf",
        args: [address],
    })

    return formatEther(balance)
}
