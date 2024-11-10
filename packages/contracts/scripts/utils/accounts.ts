import { type Address, parseEther } from "viem"
import { entryPoint07Address } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts"
import { localhost } from "viem/chains"

import { abis as mockAbis, deployment as mockDeployment } from "../../deployments/anvil/mockTokens/abis.ts"
import { abis, deployment } from "../../deployments/anvil/testing/abis"
import { account, publicClient, walletClient } from "./clients"

const DEPOSIT = parseEther("100")

function get_random_address() {
    return privateKeyToAddress(generatePrivateKey()).toString() as Address
}

async function fund_smart_account(accountAddress: Address): Promise<string> {
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

async function deposit_paymaster(): Promise<string> {
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

async function initialize_total_supply(): Promise<string> {
    const hash = await walletClient.writeContract({
        address: mockDeployment.MockTokenA,
        abi: mockAbis.MockTokenA,
        functionName: "mint",
        args: [get_random_address(), DEPOSIT],
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return receipt.status
}

export { deposit_paymaster, fund_smart_account, get_random_address, initialize_total_supply }
