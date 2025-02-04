import { abis } from "@happy.tech/contracts/random/anvil"
import { promiseWithResolvers, sleep } from "@happy.tech/common"
import { TransactionManager, TransactionStatus, TxmHookType } from "@happy.tech/txm"
import type { LatestBlock, Transaction } from "@happy.tech/txm"
import { CustomGasEstimator } from "./CustomGasEstimator.js"
import { Drand } from "./Drand"
import { DrandRepository } from "./DrandRepository"
import { DrandError, DrandService } from "./DrandService"
import { Randomness, RandomnessStatus } from "./Randomness.js"
import { RandomnessRepository } from "./RandomnessRepository.js"
import { TransactionFactory } from "./TransactionFactory.js"
import { env } from "./env.js"

const MS_IN_SECOND = 1000

class RandomnessService {
    private readonly randomnessRepository: RandomnessRepository
    private readonly drandRepository: DrandRepository
    private readonly txm: TransactionManager
    private readonly transactionFactory: TransactionFactory
    private readonly drandService: DrandService
    private getDrandBeaconLocked = false
    private pendingGetDrandBeaconPromises: PromiseWithResolvers<void>[] = []
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
        this.transactionFactory = new TransactionFactory(this.txm, env.RANDOM_CONTRACT_ADDRESS, env.PRECOMMIT_DELAY)
        this.drandService = new DrandService()

        this.txm.addTransactionOriginator(this.onCollectTransactions.bind(this))
    }

    async start() {
        await Promise.all([this.txm.start(), this.randomnessRepository.start()])
        this.txm.addHook(TxmHookType.TransactionStatusChanged, this.onTransactionStatusChange.bind(this))
        this.txm.addHook(TxmHookType.NewBlock, this.onNewBlock.bind(this))

        // Synchronize the retrieval of new Drand beacons with the Drand network to request them as soon as they become available.
        const periodMs = Number(env.EVM_DRAND_PERIOD_SECONDS) * MS_IN_SECOND
        const drandGenesisTimestampMs = Number(env.EVM_DRAND_GENESIS_TIMESTAMP_SECONDS) * MS_IN_SECOND
        const now = Date.now()

        // Calculates timestamp for the next Drand beacon:
        // 1. Obtains the elapsed time since genesis: now - drandGenesisTimestampMs.
        // 2. Divides this time by the period (periodMs) and rounds up to get the next round.
        // 3. Converts the next round back to an absolute timestamp by multiplying by periodMs and adding drandGenesisTimestampMs.
        const nextDrandBeaconTimestamp =
            Math.ceil((now - drandGenesisTimestampMs) / periodMs) * periodMs + drandGenesisTimestampMs
        await sleep(nextDrandBeaconTimestamp - now)
        setInterval(async () => {
            if (this.getDrandBeaconLocked) {
                const pending = promiseWithResolvers<void>()
                this.pendingGetDrandBeaconPromises.push(pending)

                try {
                    await pending.promise
                } catch {
                    return
                }
            }

            this.getDrandBeaconLocked = true
            try {
                await this.handleNewDrandBeacons()
            } catch (error) {
                console.error("Error in handleNewDrandBeacons: ", error)
            }
            this.getDrandBeaconLocked = false

            this.pendingGetDrandBeaconPromises.pop()?.resolve()
            this.pendingGetDrandBeaconPromises.forEach((p) => p.reject())
        }, Number(env.EVM_DRAND_PERIOD_SECONDS) * MS_IN_SECOND)
    }

    private onTransactionStatusChange(transaction: Transaction) {
        const randomness = this.randomnessRepository.getRandomnessForIntentId(transaction.intentId)

        if (randomness) {
            if (transaction.status === TransactionStatus.Success) {
                if (randomness.commitmentTransactionIntentId === transaction.intentId) {
                    randomness.commitmentExecuted()
                } else if (randomness.revealTransactionIntentId === transaction.intentId) {
                    randomness.revealExecuted()
                }
            } else if (
                transaction.status === TransactionStatus.Failed ||
                transaction.status === TransactionStatus.Expired
            ) {
                if (randomness.commitmentTransactionIntentId === transaction.intentId) {
                    randomness.commitmentFailed()
                } else if (randomness.revealTransactionIntentId === transaction.intentId) {
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

        const drand = this.drandRepository.getDrandByTransactionIntentId(transaction.intentId)

        if (drand) {
            if (transaction.status === TransactionStatus.Failed) {
                drand.transactionFailed()
            } else if (transaction.status === TransactionStatus.Success) {
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
            if (randomness.blockNumber < block.number + 1n) {
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
        const oldestDrand = this.drandRepository.getOldestDrandRound() ?? env.EVM_DRAND_START_ROUND
        const drandGaps = this.drandRepository.findRoundGapsInRange(oldestDrand, currentRound)

        await Promise.all(
            drandGaps.map(async (round) => {
                let drandBeacon = await this.drandService.getDrandBeacon(round)
                if (drandBeacon.isErr()) {
                    if (drandBeacon.error !== DrandError.TooEarly) {
                        console.error("Failed to get drand beacon", drandBeacon.error)
                        return
                    }

                    await sleep(1000)
                    drandBeacon = await this.drandService.getDrandBeacon(round)

                    if (drandBeacon.isErr()) {
                        console.error("Failed to get drand beacon", drandBeacon.error)
                        return
                    }
                }

                const postDrandTransactionResult = this.transactionFactory.createPostDrandTransaction({
                    round: round,
                    signature: drandBeacon.value.signature,
                })

                if (postDrandTransactionResult.isErr()) {
                    console.error("Failed to create post drand transaction", postDrandTransactionResult.error)
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
                    console.error("Failed to save drand", drandSaved.error)
                    return
                }

                this.pendingPostDrandTransactions.push(postDrandTransaction)
            }),
        )
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

        if (!randomnessToReveal) {
            console.warn("Not found randomness to reveal with block number", nextBlockNumber)
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
