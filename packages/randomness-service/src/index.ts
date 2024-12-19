import { sleep } from "@happychain/common"
import { TransactionManager, TransactionStatus, TxmHookType } from "@happychain/transaction-manager"
import type { LatestBlock, Transaction } from "@happychain/transaction-manager"
import { abis } from "./ABI/random.js"
import { CustomGasEstimator } from "./CustomGasEstimator.js"
import { Drand, DrandStatus } from "./Drand"
import { DrandRepository } from "./DrandRepository"
import { DrandError, DrandService } from "./DrandService"
import { CommitmentTransactionFactory } from "./Factories/CommitmentTransactionFactory.js"
import { PostDrandTransactionFactory } from "./Factories/PostDrandTransactionFactory"
import { RevealValueTransactionFactory } from "./Factories/RevealValueTransactionFactory.js"
import { Randomness, RandomnessStatus } from "./Randomness.js"
import { RandomnessRepository } from "./RandomnessRepository.js"
import { env } from "./env.js"

class RandomnessService {
    private readonly randomnessRepository: RandomnessRepository
    private readonly drandRepository: DrandRepository
    private readonly txm: TransactionManager
    private readonly commitmentTransactionFactory: CommitmentTransactionFactory
    private readonly revealValueTransactionFactory: RevealValueTransactionFactory
    private readonly postDrandTransactionFactory: PostDrandTransactionFactory
    private readonly drandService: DrandService

    private pendingPostDrandTransactions: Transaction[] = []

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
        })
        this.commitmentTransactionFactory = new CommitmentTransactionFactory(
            this.txm,
            env.RANDOM_CONTRACT_ADDRESS,
            env.PRECOMMIT_DELAY,
        )
        this.revealValueTransactionFactory = new RevealValueTransactionFactory(this.txm, env.RANDOM_CONTRACT_ADDRESS)
        this.postDrandTransactionFactory = new PostDrandTransactionFactory(this.txm, env.RANDOM_CONTRACT_ADDRESS)
        this.drandService = new DrandService()

        this.txm.addTransactionOriginator(this.onCollectTransactions.bind(this))
    }

    async start() {
        await Promise.all([this.txm.start(), this.randomnessRepository.start(), this.drandRepository.start()])
        this.txm.addHook(this.onTransactionStatusChange.bind(this), TxmHookType.TransactionStatusChanged)
        this.txm.addHook(this.onNewBlock.bind(this), TxmHookType.NewBlock)

        const periodMs = env.EVM_DRAND_PERIOD_SECONDS * 1000
        const now = Date.now()
        const nextDrandBeaconTimestamp = Math.ceil(now / periodMs) * periodMs

        await sleep(nextDrandBeaconTimestamp - now)
        setInterval(async () => {
            await this.handleNewDrandBeacons()
        }, env.EVM_DRAND_PERIOD_SECONDS * 1000)
    }

    private onTransactionStatusChange(payload: { transaction: Transaction }) {
        const randomness = this.randomnessRepository.getRandomnessForIntentId(payload.transaction.intentId)

        if (randomness) {
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

            return
        }

        const drand = this.drandRepository.getDrandByTransactionIntentId(payload.transaction.intentId)

        if (drand) {
            if (payload.transaction.status === TransactionStatus.Failed) {
                drand.transactionFailed()
            } else if (payload.transaction.status === TransactionStatus.Success) {
                drand.executionSuccess()
            }

            this.drandRepository.updateDrand(drand).catch((error) => {
                console.error("Failed to update drand", error)
            })

            return
        }

        console.warn("Unknown transaction", payload.transaction.intentId)
    }

    private async onNewBlock(payload: { block: LatestBlock }) {
        this.handleRevealNotSubmittedOnTime(payload.block)
        this.randomnessRepository.pruneRandomnesses(payload.block.timestamp).then((result) => {
            if (result.isErr()) {
                console.error("Failed to prune commitments", result.error)
            }
        })
    }

    private async handleRevealNotSubmittedOnTime(block: LatestBlock) {
        const randomnesses = this.randomnessRepository.getRandomnessInStatus(RandomnessStatus.COMMITMENT_EXECUTED)

        const nextBlockNumber = block.number + 1n

        for (const randomness of randomnesses) {
            if (randomness.blockNumber < nextBlockNumber) {
                randomness.revealNotSubmittedOnTime()
                this.randomnessRepository.updateRandomness(randomness).then((result) => {
                    if (result.isErr()) {
                        console.error("Failed to update randomness", result.error)
                    }
                })
            }
        }
    }

    private async handleNewDrandBeacons() {
        const currentRound = this.drandService.currentRound()

        console.log("Current round", currentRound)

        const oldestDrand = this.drandRepository.getOldestDrandRound() ?? env.EVM_DRAND_START_ROUND

        console.log("Oldest drand", oldestDrand)

        const drandGaps = this.drandRepository.findRoundGapsInRange(oldestDrand, currentRound)

        console.log("Drand gaps", drandGaps)

        await Promise.all(
            drandGaps.map(async (round) => {
                let drandBeacon = await this.drandService.getDrandBeacon(round)

                console.log("Drand beacon", JSON.stringify(drandBeacon, null, 2))

                if (drandBeacon.isErr()) {
                    console.error("Failed to get drand beacon", drandBeacon.error)

                    if (drandBeacon.error === DrandError.TooEarly) {
                        await sleep(1000)
                        drandBeacon = await this.drandService.getDrandBeacon(round)

                        if (drandBeacon.isErr()) {
                            return
                        }
                    } else {
                        return
                    }
                }

                const postDrandTransactionResult = this.postDrandTransactionFactory.create({
                    round: round,
                    signature: drandBeacon.value.signature,
                })

                if (postDrandTransactionResult.isErr()) {
                    return
                }

                const postDrandTransaction = postDrandTransactionResult.value

                const drand = Drand.createDrand({
                    round: round,
                    signature: drandBeacon.value.signature,
                    transactionIntentId: postDrandTransaction.intentId,
                })

                const drandSaved = await this.drandRepository.saveDrand(drand)

                if (drandSaved.isErr()) {
                    return
                }

                this.pendingPostDrandTransactions.push(postDrandTransaction)
            }),
        )
    }

    private async onCollectTransactions(block: LatestBlock): Promise<Transaction[]> {
        const transactions: Transaction[] = []

        const nextBlockNumber = block.number + 1n

        // We try to commit all the range of blocks between PRECOMMIT_DELAY and POST_COMMIT_MARGIN
        const firstBlockToCommit = nextBlockNumber + env.PRECOMMIT_DELAY
        const lastBlockToCommit = firstBlockToCommit + env.POST_COMMIT_MARGIN

        // Array with numbers from firstBlockToCommit to lastBlockToCommit
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

        const randomnessToReveal = this.randomnessRepository.getRandomnessForBlockNumber(nextBlockNumber)

        if (!randomnessToReveal) {
            console.warn("Not found randomness to reveal with block number", nextBlockNumber)
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

        transactions.push(...this.pendingPostDrandTransactions)

        this.pendingPostDrandTransactions.map(async (transaction) => {
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

        this.pendingPostDrandTransactions = []

        return transactions
    }
}

new RandomnessService().start()
