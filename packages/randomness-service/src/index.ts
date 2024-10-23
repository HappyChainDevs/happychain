import { TransactionManager } from "@happychain/transaction-manager"
import type { LatestBlock, Transaction } from "@happychain/transaction-manager"
import { webSocket } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { anvil } from "viem/chains"
import { abis } from "./ABI/random.js"
import { CommitmentManager } from "./CommitmentManager.js"
import { CustomGasEstimator } from "./CustomGasEstimator.js"
import { CommitmentTransactionFactory } from "./Factories/CommitmentTransactionFactory.js"
import { RevealValueTransactionFactory } from "./Factories/RevealValueTransactionFactory.js"
import { environmentVariables } from "./env.js"

class RandomnessService {
    private readonly commitmentManager: CommitmentManager
    private readonly txm: TransactionManager
    private readonly commitmentTransactionFactory: CommitmentTransactionFactory
    private readonly revealValueTransactionFactory: RevealValueTransactionFactory
    constructor() {
        this.commitmentManager = new CommitmentManager()
        this.commitmentTransactionFactory = new CommitmentTransactionFactory(
            anvil.id,
            environmentVariables.RANDOM_CONTRACT_ADDRESS,
            environmentVariables.PRECOMMIT_DELAY,
        )
        this.revealValueTransactionFactory = new RevealValueTransactionFactory(
            anvil.id,
            environmentVariables.RANDOM_CONTRACT_ADDRESS,
        )
        this.txm = new TransactionManager({
            account: privateKeyToAccount(environmentVariables.PRIVATE_KEY),
            transport: webSocket(),
            chain: anvil,
            id: "randomness-service",
            abis: abis,
            gasEstimator: new CustomGasEstimator(),
        })
    }

    async start() {
        this.txm.start()
        this.txm.addTransactionCollector(this.onCollectTransactions.bind(this))
    }

    private onCollectTransactions(block: LatestBlock): Transaction[] {
        const transactions: Transaction[] = []

        const commitmentTimestamp =
            block.timestamp + environmentVariables.PRECOMMIT_DELAY + environmentVariables.POST_COMMIT_MARGIN
        const commitment = this.commitmentManager.generateCommitmentForTimestamp(commitmentTimestamp)

        const commitmentTransaction = this.commitmentTransactionFactory.create(
            commitmentTimestamp,
            commitment.commitment,
        )

        transactions.push(commitmentTransaction)

        const revealValueCommitment = this.commitmentManager.getCommitmentForTimestamp(
            block.timestamp + environmentVariables.TIME_BLOCK,
        )

        if (revealValueCommitment) {
            const revealValueTransaction = this.revealValueTransactionFactory.create(
                block.timestamp + environmentVariables.TIME_BLOCK,
                revealValueCommitment.value,
            )
            transactions.push(revealValueTransaction)
        }

        return transactions
    }
}

const service = new RandomnessService()
service.start()
