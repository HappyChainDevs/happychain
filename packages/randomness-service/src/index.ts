//import { happyChainTestnetChain } from "@happychain/common"
import { Transaction, TransactionManager } from "@happychain/transaction-manager"
import { http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { anvil } from "viem/chains"
import { ContractAlias, abis } from "./ABI/random.js"

const client = await TransactionManager.create({
    account: privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"),
    transport: http(),
    chain: anvil,
    id: "randomness-service",
    abis: abis,
})

let number = 0

client.addTransactionCollector(() => {
    const transactionCount = 1
    const transactions = []

    for (let i = 0; i < transactionCount; i++) {
        number += 1
        const transaction = new Transaction({
            chainId: anvil.id,
            address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            functionName: "postCommitment",
            alias: "Random",
            args: [
                Math.floor(Date.now() / 1000) * 20,
                "0x4e3f2a1b5c6d7e8f9a0b1c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4e5f607",
            ],
            deadline: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 60),
        })
        transactions.push(transaction)
    }

    return transactions
})
