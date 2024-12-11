import { TransactionManager, TransactionStatus, TxmHookType } from "@happychain/transaction-manager"
import type { LatestBlock, Transaction } from "@happychain/transaction-manager"
import { abis } from "./ABI/random.js"
import { CustomGasEstimator } from "./CustomGasEstimator.js"
import { CommitmentTransactionFactory } from "./Factories/CommitmentTransactionFactory.js"
import { RevealValueTransactionFactory } from "./Factories/RevealValueTransactionFactory.js"
import { Randomness, RandomnessStatus } from "./Randomness.js"
import { RandomnessRepository } from "./RandomnessRepository.js"
import { env } from "./env.js"

class RandomnessService {
    private readonly randomnessRepository: RandomnessRepository
    private readonly txm: TransactionManager
    private readonly commitmentTransactionFactory: CommitmentTransactionFactory
    private readonly revealValueTransactionFactory: RevealValueTransactionFactory
    constructor() {
        this.randomnessRepository = new RandomnessRepository()
        this.txm = new TransactionManager({
            privateKey: env.PRIVATE_KEY,
            chainId: 31337,
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
        await Promise.all([this.txm.start(), this.randomnessRepository.start()])
        this.txm.addHook(this.onTransactionStatusChange.bind(this), TxmHookType.TransactionStatusChanged)
    }

    private onTransactionStatusChange(payload: { transaction: Transaction }) {
        const randomness = this.randomnessRepository.getRandomnessForIntentId(payload.transaction.intentId)

        if (!randomness) {
            console.warn("Not found randomness with intentId", payload.transaction.intentId)
            return
        }

        if (payload.transaction.status === TransactionStatus.Success) {
            if (randomness.commitmentTransactionIntentId === payload.transaction.intentId) {
                randomness.commitmentExecuted()
            } else if (randomness.revealTransactionIntentId === payload.transaction.intentId) {
                randomness.revealExecuted()
            }
            this.randomnessRepository.updateRandomness(randomness).then((result) => {
                if (result.isErr()) {
                    console.error("Failed to update randomness", result.error)
                }
            })
        } else if (
            payload.transaction.status === TransactionStatus.Failed ||
            payload.transaction.status === TransactionStatus.Expired
        ) {
            if (randomness.commitmentTransactionIntentId === payload.transaction.intentId) {
                randomness.commitmentFailed()
            } else if (randomness.revealTransactionIntentId === payload.transaction.intentId) {
                randomness.revealFailed()
            }
        }
    }

    private async handleRevealNotSubmittedOnTime(block: LatestBlock) {
        const randomnesses = this.randomnessRepository.getRandomnessInStatus(RandomnessStatus.COMMITMENT_EXECUTED)

        const nextBlockTimestamp = block.timestamp + env.TIME_BLOCK

        for (const randomness of randomnesses) {
            if (randomness.timestamp < nextBlockTimestamp) {
                randomness.revealNotSubmittedOnTime()
                this.randomnessRepository.updateRandomness(randomness).then((result) => {
                    if (result.isErr()) {
                        console.error("Failed to update randomness", result.error)
                    }
                })
            }
        }
    }

    private async onCollectTransactions(block: LatestBlock): Promise<Transaction[]> {
        // TODO: Move to a on new block hook when we have it - https://linear.app/happychain/issue/HAPPY-257/create-onnewblock-hook
        this.handleRevealNotSubmittedOnTime(block)

        const transactions: Transaction[] = []

        const nextBlockTimestamp = block.timestamp + env.TIME_BLOCK

        // We try to commit all the range of blocks between PRECOMMIT_DELAY and POST_COMMIT_MARGIN
        const firstBlockToCommit = nextBlockTimestamp + env.PRECOMMIT_DELAY
        const lastBlockToCommit = firstBlockToCommit + env.POST_COMMIT_MARGIN

        // Aray with numners from, firstBlockToCommit to lastBlockToCommit but adding +2 between each number
        const timestampsToCommit = Array.from(
            { length: Number(lastBlockToCommit - firstBlockToCommit) },
            (_, i) => firstBlockToCommit + BigInt(i) * 2n,
        )

        for (const timestamp of timestampsToCommit) {
            const randomness = this.randomnessRepository.getRandomnessForTimestamp(timestamp)

            // Already has a randomness for this timestamp, so we skip
            if (randomness) {
                continue
            }

            const newRandomness = Randomness.createRandomness(timestamp)

            const commitmentTransaction = this.commitmentTransactionFactory.create(newRandomness)

            transactions.push(commitmentTransaction)

            newRandomness.addCommitmentTransactionIntentId(commitmentTransaction.intentId)

            // We don't await for saving the commitment, because we dont want to block the transaction collection
            this.randomnessRepository.saveRandomness(newRandomness).then((result) => {
                if (result.isErr()) {
                    console.error("Failed to save commitment", result.error)
                }
            })
        }

        const randomnessToReveal = this.randomnessRepository.getRandomnessForTimestamp(nextBlockTimestamp)

        if (!randomnessToReveal) {
            console.warn("Not found randomness to reveal with timestamp", nextBlockTimestamp)
            return transactions
        }

        const revealValueTransaction = this.revealValueTransactionFactory.create(randomnessToReveal)

        transactions.push(revealValueTransaction)

        randomnessToReveal.addRevealTransactionIntentId(revealValueTransaction.intentId)

        this.randomnessRepository.updateRandomness(randomnessToReveal).then((result) => {
            if (result.isErr()) {
                console.error("Failed to update randomness", result.error)
            }
        })

        // We don't await for pruning, because we don't want to block the transaction collection
        this.randomnessRepository.pruneRandomnesses(block.timestamp).then((result) => {
            if (result.isErr()) {
                console.error("Failed to prune commitments", result.error)
            }
        })

        return transactions
    }
}

new RandomnessService().start()
