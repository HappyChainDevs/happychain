import {
    type SafeViemPublicClient,
    type SafeViemWalletClient,
    type UUID,
    convertToSafeViemPublicClient,
    convertToSafeViemWalletClient,
} from "@happychain/common"
import { type Abi, type Account, type Chain, type Transport, createPublicClient, createWalletClient } from "viem"
import { ABIManager } from "./AbiManager.js"
import { BlockMonitor, type LatestBlock } from "./BlockMonitor.js"
import { GasEstimator } from "./GasEstimator.js"
import { GasPriceOracle } from "./GasPriceOracle.js"
import { HookManager, type TxmHookHandler, type TxmHookType } from "./HookManager.js"
import { NonceManager } from "./NonceManager.js"
import { Transaction, type TransactionConstructorConfig } from "./Transaction.js"
import { TransactionCollector } from "./TransactionCollector.js"
import { TransactionRepository } from "./TransactionRepository.js"
import { TransactionSubmitter } from "./TransactionSubmitter.js"
import { TxMonitor } from "./TxMonitor.js"
import { type EIP1559Parameters, opStackDefaultEIP1559Parameters } from "./eip1559.js"

export type TransactionManagerConfig = {
    /** The transport protocol used for the client. See {@link Transport} from viem for more details. */
    transport: Transport
    /** The account used for transactions. See {@link Account} from viem for more details. */
    account: Account
    /** The blockchain network configuration. See {@link Chain} from viem for more details. */
    chain: Chain
    /** Optional EIP-1559 parameters. If not provided, defaults to the OP stack's stock parameters. */
    eip1559?: EIP1559Parameters
    /**
     * Safety margin for transaction base fees, expressed as a percentage.
     * For example, a 20% increase should be represented as 20n.
     *
     * This is used to calculate the maximum fee per gas and safeguard from unanticipated or
     * unpredictable gas price increases, in particular when the transaction cannot be included in
     * the very next block.
     *
     * If not provided, defaults to 20n (20% increase).
     */
    baseFeePercentageMargin?: bigint
    /**
     * Optional maximum priority fee per gas.
     * This is the maximum amount of wei per gas the transaction is willing to pay as a tip to miners.
     * If not provided, defaults to 0n.
     */
    maxPriorityFeePerGas?: bigint

    /** The ABIs used by the TransactionManager.
     * This is a record of aliases to ABIs. The aliases are used to reference the ABIs in the
     * transactions.
     */
    abis: Record<string, Abi>

    /**
     * Enables debug methods on the RPC node.
     * This is necessary for retrieving revert reasons for failed transactions
     * and for increasing precision in managing transactions that fail due to out-of-gas errors
     * Defaults to false.
     */
    rpcAllowDebug?: boolean

    /**
     * The expected interval (in seconds) for the creation of a new block on the blockchain.
     * Defaults to 2 seconds.
     */
    blockTime?: bigint

    /**
     * The time (in milliseconds) after which finalized transactions are purged from the database.
     * If finalizedTransactionPurgeTime is 0, finalized transactions are not purged from the database.
     * Defaults to 2 minutes.
     */
    finalizedTransactionPurgeTime?: number

    /**
     * The gas estimator to use for estimating the gas limit of a transaction.
     * You can provide your own implementation to override the default one.
     * Default: {@link GasEstimator}
     */
    gasEstimator?: GasEstimator
}

export type TransactionOriginator = (block: LatestBlock) => Promise<Transaction[]>

/**
 * This is the core module. As a user of the transaction manager, this is the module you need to import and instantiate.
 * It maintains public references to all other modules, allowing seamless access between them.
 * While it doesn’t contain much logic itself, as most functionality is distributed across other modules, it serves as the main
 * public interface, acting as a bridge between the library and the user.
 */
export class TransactionManager {
    public readonly collectors: TransactionOriginator[]
    public readonly blockMonitor: BlockMonitor
    public readonly viemWallet: SafeViemWalletClient
    public readonly viemClient: SafeViemPublicClient
    public readonly nonceManager: NonceManager
    public readonly gasPriceOracle: GasPriceOracle
    public readonly gasEstimator: GasEstimator
    public readonly abiManager: ABIManager
    public readonly pendingTxReporter: TxMonitor
    public readonly transactionRepository: TransactionRepository
    public readonly transactionCollector: TransactionCollector
    public readonly transactionSubmitter: TransactionSubmitter
    public readonly hookManager: HookManager

    public readonly eip1559: EIP1559Parameters
    public readonly baseFeeMargin: bigint
    public readonly maxPriorityFeePerGas: bigint
    public readonly rpcAllowDebug: boolean
    public readonly blockTime: bigint
    public readonly finalizedTransactionPurgeTime: number

    constructor(_config: TransactionManagerConfig) {
        this.collectors = []
        this.viemWallet = convertToSafeViemWalletClient(
            createWalletClient({
                account: _config.account,
                transport: _config.transport,
                chain: _config.chain,
            }),
        )

        this.viemClient = convertToSafeViemPublicClient(
            createPublicClient({
                transport: _config.transport,
                chain: _config.chain,
            }),
        )

        this.nonceManager = new NonceManager(this)
        this.gasPriceOracle = new GasPriceOracle(this)
        this.gasEstimator = _config.gasEstimator || new GasEstimator()
        this.blockMonitor = new BlockMonitor(this)
        this.pendingTxReporter = new TxMonitor(this)
        this.transactionRepository = new TransactionRepository(this)
        this.transactionCollector = new TransactionCollector(this)
        this.transactionSubmitter = new TransactionSubmitter(this)
        this.hookManager = new HookManager()

        this.eip1559 = _config.eip1559 || opStackDefaultEIP1559Parameters
        this.abiManager = new ABIManager(_config.abis)

        this.baseFeeMargin = _config.baseFeePercentageMargin || 20n
        this.maxPriorityFeePerGas = _config.maxPriorityFeePerGas || 0n

        this.rpcAllowDebug = _config.rpcAllowDebug || false
        this.blockTime = _config.blockTime || 2n
        this.finalizedTransactionPurgeTime = _config.finalizedTransactionPurgeTime || 2 * 60 * 1000
    }

    /**
     * Adds a originator to the transaction manager.
     * A originator is a function that returns a list of transactions to be sent in the next block.
     * It is important that the originator function is as fast as possible to avoid delays when sending transactions to the blockchain
     * @param originator - The originator to add.
     */
    public addTransactionOriginator(originator: TransactionOriginator): void {
        this.collectors.push(originator)
    }

    /**
     * Adds a hook to the hook manager.
     * @param type - The type of hook to add.
     * @param handler - The handler function to add.
     */
    public async addHook(handler: TxmHookHandler, type: TxmHookType): Promise<void> {
        await this.hookManager.addHook(handler, type)
    }

    public async getTransaction(txIntentId: UUID): Promise<Transaction | undefined> {
        return this.transactionRepository.getTransaction(txIntentId)
    }

    /**
     * Creates a new transaction.
     * @param params - {@link TransactionConstructorConfig}.
     * @returns A new transaction.
     */
    public createTransaction(params: TransactionConstructorConfig): Transaction {
        return new Transaction({
            ...params,
            from: this.viemWallet.account.address,
            chainId: this.viemWallet.chain.id,
        })
    }

    public async start(): Promise<void> {
        // Start the gas price oracle to prevent other parts of the application from calling `suggestGasForNextBlock` before the gas price oracle has initialized the gas price after processing the first block
        const priceOraclePromise = this.gasPriceOracle.start()

        // Start the transaction repository
        await this.transactionRepository.start()

        // Start the nonce manager, which depends on the transaction repository
        await this.nonceManager.start()

        // Await the completion of the gas price oracle startup before marking the TransactionManager as started
        await priceOraclePromise
    }
}
