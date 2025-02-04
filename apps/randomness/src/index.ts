import { abis } from "@happy.tech/contracts/random/anvil"
import { TransactionManager, TransactionStatus, TxmHookType } from "@happy.tech/txm"
import type { LatestBlock, Transaction } from "@happy.tech/txm"
import { CustomGasEstimator } from "./CustomGasEstimator.js"
import { Randomness, RandomnessStatus } from "./Randomness.js"
import { RandomnessRepository } from "./RandomnessRepository.js"
import { TransactionFactory } from "./TransactionFactory.js"
import { env } from "./env.js"

class RandomnessService {
    private readonly randomnessRepository: RandomnessRepository
    private readonly txm: TransactionManager
    private readonly transactionFactory: TransactionFactory
    constructor() {
        this.randomnessRepository = new RandomnessRepository()
        this.txm = new TransactionManager({
            privateKey: env.PRIVATE_KEY,
            chainId: env.CHAIN_ID,
            abis: abis,
            gasEstimator: new CustomGasEstimator(),
            rpc: {
                url: env.RPC_URL,
            },
        })
        this.transactionFactory = new TransactionFactory(this.txm, env.RANDOM_CONTRACT_ADDRESS, env.PRECOMMIT_DELAY)

        this.txm.addTransactionOriginator(this.onCollectTransactions.bind(this))
    }

    async start() {
        await Promise.all([this.txm.start(), this.randomnessRepository.start()])
        this.txm.addHook(this.onTransactionStatusChange.bind(this), TxmHookType.TransactionStatusChanged)
    }

    private onTransactionStatusChange(payload: { transaction: Transaction }) {
        const randomness = this.randomnessRepository.getRandomnessForIntentId(payload.transaction.intentId)

        if (!randomness) {
            console.warn("Couldn't find randomness with intentId", payload.transaction.intentId)
            return
        }

        if (payload.transaction.status === TransactionStatus.Success) {
            if (randomness.commitmentTransactionIntentId === payload.transaction.intentId) {
                randomness.commitmentExecuted()
            } else if (randomness.revealTransactionIntentId === payload.transaction.intentId) {
                randomness.revealExecuted()
            }
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

        this.randomnessRepository.updateRandomness(randomness).then((result) => {
            if (result.isErr()) {
                console.error("Failed to update randomness", result.error)
            }
        })
    }

    private async handleRevealNotSubmittedOnTime(block: LatestBlock) {
        const randomnesses = this.randomnessRepository.getRandomnessInStatus(RandomnessStatus.COMMITMENT_EXECUTED)

        const nextBlockTimestamp = block.timestamp + env.BLOCK_TIME

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

        const nextBlockTimestamp = block.timestamp + env.BLOCK_TIME

        // We try to precommit for all blocks in [nextBlockTimestamp +  PRECOMMIT_DELAY, nextBlockTimestamp + PRECOMMIT_DELAY +  POST_COMMIT_MARGIN].
        const firstCommitTime = nextBlockTimestamp + env.PRECOMMIT_DELAY
        const lastCommitTime = firstCommitTime + env.POST_COMMIT_MARGIN

        // Array with timestamps from firstBlockToCommit to lastBlockToCommit
        const timestampsToCommit = Array.from(
            { length: Number(lastCommitTime - firstCommitTime) },
            (_, i) => firstCommitTime + BigInt(i),
        )

        for (const timestamp of timestampsToCommit) {
            const randomness = this.randomnessRepository.getRandomnessForTimestamp(timestamp)

            // Already has a randomness for this timestamp, so we skip
            if (randomness) {
                continue
            }

            const newRandomness = Randomness.createRandomness(timestamp)

            const commitmentTransaction = this.transactionFactory.createCommitmentTransaction(newRandomness)

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

        const revealValueTransaction = this.transactionFactory.createRevealValueTransaction(randomnessToReveal)

        transactions.unshift(revealValueTransaction)

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
