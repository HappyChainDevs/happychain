import { type Address, parseEther } from "viem"
import { entryPoint07Address } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts"
import { localhost } from "viem/chains"

import { abis, deployment } from "../../deployments/anvil/testing/abis"
import { account, publicClient, walletClient } from "./clients"

const PM_DEPOSIT = parseEther("100")

function getRandomAccount() {
    return privateKeyToAddress(generatePrivateKey()).toString() as Address
}

async function fund_smart_account(accountAddress: Address): Promise<string> {
    const txHash = await walletClient.sendTransaction({
        account: account,
        to: accountAddress,
        chain: localhost,
        value: parseEther("0.1"),
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
        value: PM_DEPOSIT,
    })

    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
    })

    return receipt.status
}

export { getRandomAccount, fund_smart_account, deposit_paymaster }
