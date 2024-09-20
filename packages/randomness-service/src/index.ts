//import { happyChainTestnetChain } from "@happychain/common"
import { Transaction, TransactionManager } from "@happychain/transaction-manager"
import { http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { anvil } from "viem/chains"

const client = await TransactionManager.create({
    account: privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"),
    transport: http(),
    chain: anvil,
    id: "randomness-service",
    abis: {
        Storage: [
            {
                inputs: [],
                name: "retrieve",
                outputs: [
                    {
                        internalType: "uint256",
                        name: "",
                        type: "uint256",
                    },
                ],
                stateMutability: "view",
                type: "function",
            },
            {
                inputs: [
                    {
                        internalType: "uint256",
                        name: "num",
                        type: "uint256",
                    },
                ],
                name: "store",
                outputs: [],
                stateMutability: "nonpayable",
                type: "function",
            },
        ],
    },
})

let number = 0

client.addTransactionCollector(() => {
    const transactionCount = Math.floor(Math.random() * 20) + 1
    const transactions = []

    for (let i = 0; i < transactionCount; i++) {
        number += 1
        const transaction = new Transaction({
            chainId: anvil.id,
            address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            functionName: "store",
            alias: "Storage",
            args: [number],
        })
        transactions.push(transaction)
    }

    return transactions
})
