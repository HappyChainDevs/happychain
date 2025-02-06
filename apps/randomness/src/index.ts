import { abis } from "@happy.tech/contracts/random/anvil"
import { TransactionManager, TransactionStatus, TxmHookType } from "@happy.tech/txm"
import type { LatestBlock, Transaction } from "@happy.tech/txm"
import { CustomGasEstimator } from "./CustomGasEstimator.js"
import { DrandRepository } from "./DrandRepository"
import { DrandService } from "./DrandService"
import { Randomness, RandomnessStatus } from "./Randomness.js"
import { RandomnessRepository } from "./RandomnessRepository.js"
import { TransactionFactory } from "./TransactionFactory.js"
import { env } from "./env.js"

class RandomnessService {
    private readonly randomnessRepository: RandomnessRepository
    private readonly drandRepository: DrandRepository
    private readonly txm: TransactionManager
    private readonly transactionFactory: TransactionFactory
    private readonly drandService: DrandService

    constructor() {
        this.randomnessRepository = new RandomnessRepository()
        this.drandRepository = new DrandRepository()
        this.txm = new TransactionManager({
            privateKey: env.PRIVATE_KEY,
            chainId: env.CHAIN_ID,
            abis: abis,
            gasEstimator: new CustomGasEstimator(),
            rpc: {
                url: env.RPC_URL,
                allowDebug: true,
            },
            maxPriorityFeePerGas: 10n
        })
        this.transactionFactory = new TransactionFactory(this.txm, env.RANDOM_CONTRACT_ADDRESS, env.PRECOMMIT_DELAY)
        this.drandService = new DrandService(this.drandRepository, this.transactionFactory)
    }

    async start() {
        await Promise.all([this.txm.start(), this.randomnessRepository.start()])
        this.txm.addTransactionOriginator(this.onCollectTransactions.bind(this))
        this.txm.addHook(TxmHookType.TransactionStatusChanged, this.onTransactionStatusChange.bind(this))
        this.txm.addHook(TxmHookType.NewBlock, this.onNewBlock.bind(this))
        this.txm.addHook(TxmHookType.TransactionSubmissionFailed, (_, description) => {
            console.error(description)
        })

        await this.drandService.start()
    }

    private onTransactionStatusChange(transaction: Transaction) {
        const randomness = this.randomnessRepository.getRandomnessForIntentId(transaction.intentId)

        const successStatuses = [TransactionStatus.Success]
        const failedStatuses = [TransactionStatus.Failed, TransactionStatus.Expired, TransactionStatus.Cancelled]

        if (randomness) {
            if (successStatuses.includes(transaction.status)) {
                if (randomness.commitmentTransactionIntentId === transaction.intentId) {
                    randomness.commitmentExecuted()
                } else if (randomness.revealTransactionIntentId === transaction.intentId) {
                    randomness.revealExecuted()
                }
            } else if (failedStatuses.includes(transaction.status)) {
                if (randomness.commitmentTransactionIntentId === transaction.intentId) {
                    randomness.commitmentFailed()
                } else if (randomness.revealTransactionIntentId === transaction.intentId) {
                    randomness.revealFailed()
                }
            }

            if (successStatuses.includes(transaction.status) || failedStatuses.includes(transaction.status)) {
                this.randomnessRepository.updateRandomness(randomness).then((result) => {
                    if (result.isErr()) {
                        console.error("Failed to update randomness", result.error)
                    }
                })
            }

            return
        }

        const drand = this.drandRepository.getDrandByTransactionIntentId(transaction.intentId)

        if (drand) {
            if (failedStatuses.includes(transaction.status)) {
                drand.transactionFailed()
            } else if (successStatuses.includes(transaction.status)) {
                drand.executionSuccess()
            }

            this.drandRepository.updateDrand(drand).catch((error) => {
                console.error("Failed to update drand", error)
            })

            return
        }

        console.warn("Couldn't find randomness or drand with intentId", transaction.intentId)
    }

    private async onNewBlock(block: LatestBlock) {
        this.handleRevealNotSubmittedOnTime(block)
        this.randomnessRepository.pruneRandomnesses(block.number).then((result) => {
            if (result.isErr()) {
                console.error("Failed to prune commitments", result.error)
            }
        })
    }

    private async handleRevealNotSubmittedOnTime(block: LatestBlock) {
        const randomnesses = this.randomnessRepository.getRandomnessInStatus(RandomnessStatus.COMMITMENT_EXECUTED)

        for (const randomness of randomnesses) {
            if (randomness.blockNumber <= block.number) {
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
        const transactions: Transaction[] = []

        const nextBlockNumber = block.number + 1n

        // We try to precommit for all blocks in [nextBlockNumber +  PRECOMMIT_DELAY, nextBlockNumber + PRECOMMIT_DELAY +  POST_COMMIT_MARGIN].
        const firstBlockToCommit = nextBlockNumber + env.PRECOMMIT_DELAY
        const lastBlockToCommit = firstBlockToCommit + env.POST_COMMIT_MARGIN

        // Array with blocks from firstBlockToCommit to lastBlockToCommit
        const blockNumbersToCommit = Array.from(
            { length: Number(lastBlockToCommit - firstBlockToCommit) },
            (_, i) => firstBlockToCommit + BigInt(i),
        )

        for (const blockNumber of blockNumbersToCommit) {
            const randomness = this.randomnessRepository.getRandomnessForBlockNumber(blockNumber)

            // Already has a randomness for this timestamp, so we skip
            if (randomness) {
                continue
            }

            const newRandomness = Randomness.createRandomness(blockNumber)

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

        const randomnessToReveal = this.randomnessRepository.getRandomnessForBlockNumber(nextBlockNumber)

        if (randomnessToReveal) {
            const revealValueTransaction = this.transactionFactory.createRevealValueTransaction(randomnessToReveal)

            transactions.unshift(revealValueTransaction)

            randomnessToReveal.addRevealTransactionIntentId(revealValueTransaction.intentId)

            this.randomnessRepository.updateRandomness(randomnessToReveal).then((result) => {
                if (result.isErr()) {
                    console.error("Failed to update randomness", result.error)
                }
            })
        }

        const drandTransactions = this.drandService.pullDrandTransactions()

        transactions.push(...drandTransactions)

        drandTransactions.map(async (transaction) => {
            const drand = this.drandRepository.getDrandByTransactionIntentId(transaction.intentId)

            if (!drand) {
                console.error("Drand not found for transaction", transaction.intentId)
                return
            }

            drand.transactionSubmitted()
            this.drandRepository.updateDrand(drand).catch((error) => {
                console.error("Failed to update drand", error)
            })
        })

        return transactions
    }
}

new RandomnessService().start()
