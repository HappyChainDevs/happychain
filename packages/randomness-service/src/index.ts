import { happyChainTestnetChain } from "@happychain/common"
import { Transaction, TransactionManager } from "@happychain/transaction-manager"
import { http } from "viem"
import { privateKeyToAccount } from "viem/accounts"

const client = await TransactionManager.create({
    account: privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"),
    transport: http(),
    chain: happyChainTestnetChain,
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
    number += 1
    const transaction = Transaction.createWithAlias(
        happyChainTestnetChain.id,
        "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        "Store",
        "store",
        [number],
    )

    return [transaction]
})
