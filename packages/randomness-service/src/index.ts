import { abis } from "@happychain/contracts/random/anvil"
import { TransactionManager, TransactionStatus } from "@happychain/transaction-manager"
import type { LatestBlock, Transaction } from "@happychain/transaction-manager"
import { CommitmentManager } from "./CommitmentManager.js"
import { CustomGasEstimator } from "./CustomGasEstimator.js"
import { CommitmentTransactionFactory } from "./Factories/CommitmentTransactionFactory.js"
import { RevealValueTransactionFactory } from "./Factories/RevealValueTransactionFactory.js"
import { env } from "./env.js"

class RandomnessService {
    private readonly commitmentManager: CommitmentManager
    private readonly txm: TransactionManager
    private readonly commitmentTransactionFactory: CommitmentTransactionFactory
    private readonly revealValueTransactionFactory: RevealValueTransactionFactory
    constructor() {
        this.commitmentManager = new CommitmentManager()
        this.txm = new TransactionManager({
            privateKey: env.PRIVATE_KEY,
            chainId: env.CHAIN_ID,
            abis: abis,
            gasEstimator: new CustomGasEstimator(),
            rpc: {
                url: env.RPC_URL,
            },
        })
        this.commitmentTransactionFactory = new CommitmentTransactionFactory(
            this.txm,
            env.RANDOM_CONTRACT_ADDRESS,
            env.PRECOMMIT_DELAY,
        )
        this.revealValueTransactionFactory = new RevealValueTransactionFactory(this.txm, env.RANDOM_CONTRACT_ADDRESS)

        this.txm.addTransactionOriginator(this.onCollectTransactions.bind(this))
    }

    async start() {
        await Promise.all([this.txm.start(), this.commitmentManager.start()])
    }

    private async onCollectTransactions(block: LatestBlock): Promise<Transaction[]> {
        const transactions: Transaction[] = []

        // We try to commit the randomness POST_COMMIT_MARGIN to be safe that the transaction is included before the PRECOMMIT_DELAY
        const commitmentTimestamp = block.timestamp + env.PRECOMMIT_DELAY + env.POST_COMMIT_MARGIN
        const partialCommitment = this.commitmentManager.generateCommitment()

        const commitmentTransaction = this.commitmentTransactionFactory.create(
            commitmentTimestamp,
            partialCommitment.commitment,
        )

        transactions.push(commitmentTransaction)

        const commitment = {
            ...partialCommitment,
            transactionIntentId: commitmentTransaction.intentId,
            timestamp: commitmentTimestamp,
        }

        this.commitmentManager.setCommitmentForTimestamp(commitment)

        // We don't await for saving the commitment, because we dont want to block the transaction collection
        this.commitmentManager.saveCommitment(commitment).then((result) => {
            if (result.isErr()) {
                console.error("Failed to save commitment", result.error)
            }
        })

        const revealValueCommitment = this.commitmentManager.getCommitmentForTimestamp(block.timestamp + env.TIME_BLOCK)

        if (revealValueCommitment) {
            const transaction = await this.txm.getTransaction(revealValueCommitment.transactionIntentId)

            if (transaction?.status === TransactionStatus.Success) {
                const revealValueTransaction = this.revealValueTransactionFactory.create(
                    block.timestamp + env.TIME_BLOCK,
                    revealValueCommitment.value,
                )
                transactions.push(revealValueTransaction)
            }
        }

        // We don't await for pruning, because we dont want to block the transaction collection
        this.commitmentManager.pruneCommitments(block.timestamp).then((result) => {
            if (result.isErr()) {
                console.error("Failed to prune commitments", result.error)
            }
        })

        return transactions
    }
}

new RandomnessService().start()
