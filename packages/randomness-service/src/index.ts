import "dotenv/config"
import { TransactionManager } from "@happychain/transaction-manager"
import type { LatestBlock, Transaction } from "@happychain/transaction-manager"
import { http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { anvil } from "viem/chains"
import { abis } from "./ABI/random.js"
import { CommitmentManager } from "./CommitmentManager.js"
import { CommitmentTransactionFactory } from "./Factories/CommitmentTransactionFactory.js"
import { RevealValueTransactionFactory } from "./Factories/RevealValueTransactionFactory.js"
import { config } from "./config.js"

class RandomnessService {
    private readonly commitmentManager: CommitmentManager
    private readonly txm: TransactionManager
    private readonly commitmentTransactionFactory: CommitmentTransactionFactory
    private readonly revealValueTransactionFactory: RevealValueTransactionFactory
    constructor() {
        this.commitmentManager = new CommitmentManager()
        this.commitmentTransactionFactory = new CommitmentTransactionFactory(
            anvil.id,
            config.randomContractAddress,
            config.precommitDelay,
        )
        this.revealValueTransactionFactory = new RevealValueTransactionFactory(anvil.id, config.randomContractAddress)
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
        this.txm.addTransactionCollector(this.onCollectTransactions.bind(this))
    }

    private onCollectTransactions(block: LatestBlock): Transaction[] {
        const commitmentTimestamp = block.timestamp + config.precommitDelay + config.postCommitMargin
        const commitment = this.commitmentManager.generateCommitmentForTimestamp(commitmentTimestamp)
        const commitmentTransaction = this.commitmentTransactionFactory.create(
            commitmentTimestamp,
            commitment.commitment,
        )

        const revealValueTransaction = this.revealValueTransactionFactory.create(
            block.timestamp + config.timeBlock,
            commitment.value,
        )

        return [commitmentTransaction, revealValueTransaction]
    }
}

const service = new RandomnessService()
service.start()
