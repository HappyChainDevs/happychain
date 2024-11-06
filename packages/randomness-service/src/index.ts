import { TransactionManager, TxmHookType } from "@happychain/transaction-manager"
import type { LatestBlock, Transaction } from "@happychain/transaction-manager"
import { webSocket } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { anvil } from "viem/chains"
import { abis } from "./ABI/random.js"
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
        this.commitmentTransactionFactory = new CommitmentTransactionFactory(
            anvil.id,
            env.RANDOM_CONTRACT_ADDRESS,
            env.PRECOMMIT_DELAY,
        )
        this.revealValueTransactionFactory = new RevealValueTransactionFactory(anvil.id, env.RANDOM_CONTRACT_ADDRESS)
        this.txm = new TransactionManager({
            account: privateKeyToAccount(env.PRIVATE_KEY),
            transport: webSocket(),
            chain: anvil,
            id: "randomness-service",
            abis: abis,
            gasEstimator: new CustomGasEstimator(),
        })

        this.txm.start()
        this.txm.addTransactionCollector(this.onCollectTransactions.bind(this))
        this.txm.addHook(TxmHookType.TransactionStatusChanged, (event) => {
            console.log(event)
        })
    }

    private onCollectTransactions(block: LatestBlock): Transaction[] {
        const transactions: Transaction[] = []

        // We try to commit the ramdomness POST_COMMIT_MARGIN to be safe that the transaction is included before the PRECOMMIT_DELAY
        const commitmentTimestamp = block.timestamp + env.PRECOMMIT_DELAY + env.POST_COMMIT_MARGIN
        const commitment = this.commitmentManager.generateCommitmentForTimestamp(commitmentTimestamp)

        const commitmentTransaction = this.commitmentTransactionFactory.create(
            commitmentTimestamp,
            commitment.commitment,
        )

        transactions.push(commitmentTransaction)

        const revealValueCommitment = this.commitmentManager.getCommitmentForTimestamp(block.timestamp + env.TIME_BLOCK)

        if (revealValueCommitment) {
            const revealValueTransaction = this.revealValueTransactionFactory.create(
                block.timestamp + env.TIME_BLOCK,
                revealValueCommitment.value,
            )
            transactions.push(revealValueTransaction)
        }

        return transactions
    }
}

new RandomnessService()
