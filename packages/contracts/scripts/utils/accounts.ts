import { type Address, encodeFunctionData, formatEther, numberToHex, parseEther } from "viem"
import { type UserOperationCall, entryPoint07Address } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts"
import { localhost } from "viem/chains"

import { abis as mockAbis, deployment as mockDeployment } from "../../deployments/anvil/mockTokens/abis.ts"
import { abis, deployment } from "../../deployments/anvil/testing/abis"
import { account, publicClient, walletClient } from "./clients"

/** Amount of ETH to mint/send in demo transactions for verification */
export const AMOUNT = "0.01"
/** Amount of ETH to deposit into paymasters/smart accounts for funding userOps */
export const DEPOSIT = parseEther("100")

export function getRandomAddress() {
    return privateKeyToAddress(generatePrivateKey()).toString() as Address
}

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

export function toHexDigits(number: bigint, size: number): string {
    return numberToHex(number, { size }).slice(2)
}

export async function getFormattedBalance(receiver: Address): Promise<string> {
    const balance = await publicClient.getBalance({
        address: receiver,
        blockTag: "latest",
    })

    return formatEther(balance)
}

export async function getFormattedTokenBalance(address: Address): Promise<string> {
    const balance = await publicClient.readContract({
        address: mockDeployment.MockTokenA,
        abi: mockAbis.MockTokenA,
        functionName: "balanceOf",
        args: [address],
    })

    return formatEther(balance)
}
