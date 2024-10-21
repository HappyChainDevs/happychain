import "dotenv/config"
import { TransactionManager } from "@happychain/transaction-manager"
import type { LatestBlock, Transaction } from "@happychain/transaction-manager"
import { http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { anvil } from "viem/chains"
import { abis } from "./ABI/random.js"
import { CommitmentManager } from "./CommitmentManager.js"
import { CommitmentTransactionFactory } from "./Factories/CommitmentTransactionFactory.js"
import { config } from "./config.js"

class RandomnessService {
    private readonly commitmentManager: CommitmentManager
    private readonly txm: TransactionManager
    private readonly commitmentTransactionFactory: CommitmentTransactionFactory
    constructor() {
        this.commitmentManager = new CommitmentManager()
        this.commitmentTransactionFactory = new CommitmentTransactionFactory(
            anvil.id,
            config.randomContractAddress,
            config.precommitDelay,
        )
        this.txm = new TransactionManager({
            account: privateKeyToAccount(config.privateKey),
            transport: http(),
            chain: anvil,
            id: "randomness-service",
            abis: abis,
        })
    }

    async start() {
        this.txm.start()
        this.txm.addTransactionCollector(this.onCollectTransactions)
    }

    private onCollectTransactions(block: LatestBlock): Transaction[] {
        const commitment = this.commitmentManager.generateCommitment(
            block.timestamp + config.precommitDelay + config.postCommitMargin,
        )
        const transaction = this.commitmentTransactionFactory.create(block.timestamp, commitment)
        return [transaction]
    }
}

const service = new RandomnessService()
service.start()
