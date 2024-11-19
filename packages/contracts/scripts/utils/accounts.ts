import { type Address, parseEther } from "viem"
import { entryPoint07Address } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts"
import { localhost } from "viem/chains"

import { abis as mockAbis, deployment as mockDeployment } from "../../deployments/anvil/mockTokens/abis.ts"
import { abis, deployment } from "../../deployments/anvil/testing/abis"
import { account, publicClient, walletClient } from "./clients"

const DEPOSIT = parseEther("100")

function getRandomAddress() {
    return privateKeyToAddress(generatePrivateKey()).toString() as Address
}

async function fundSmartAccount(accountAddress: Address): Promise<string> {
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

async function depositPaymaster(): Promise<string> {
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

async function initializeTotalSupply(): Promise<string> {
    const hash = await walletClient.writeContract({
        address: mockDeployment.MockTokenA,
        abi: mockAbis.MockTokenA,
        functionName: "mint",
        args: [getRandomAddress(), DEPOSIT],
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return receipt.status
}

export { depositPaymaster, fundSmartAccount, getRandomAddress, initializeTotalSupply }
