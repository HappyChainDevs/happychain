import {
    type Abi,
    type Account,
    type Chain,
    type Transport,
    type PublicClient as ViemClient,
    createPublicClient,
    createWalletClient,
} from "viem"
import { ABIManager } from "../AbiManager.js"
import { BlockMonitor } from "../BlockMonitor.js"
import { Topics, eventBus } from "../EventBus.js"
import { GasPriceOracle } from "../GasPriceOracle.js"
import { NonceManager } from "../NonceManager.js"
import type { Transaction } from "../Transaction.js"
import { dbDriver } from "../db.js"
import { type EIP1559Parameters, opStackDefaultEIP1559Parameters } from "../eip1559.js"
import type { ViemWalletClient } from "./viemClients.js"

export type TransactionManagerConfig = {
    /** The transport protocol used for the client. See {@link Transport} from viem for more details. */
    transport: Transport
    /** The account used for transactions. See {@link Account} from viem for more details. */
    account: Account
    /** The blockchain network configuration. See {@link Chain} from viem for more details. */
    chain: Chain
    /** A unique identifier for this TransactionManager instance. */
    id: string
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
}

export type TransactionCollector = () => Transaction[]

export class TransactionManager {
    private collectors: TransactionCollector[]

    public readonly blockMonitor: BlockMonitor
    public readonly viemWallet: ViemWalletClient
    public readonly viemClient: ViemClient
    public readonly nonceManager: NonceManager
    public readonly gasPriceOracle: GasPriceOracle
    public readonly abiManager: ABIManager

    public readonly id: string
    public readonly eip1559: EIP1559Parameters
    public readonly baseFeeMargin: bigint
    public readonly maxPriorityFeePerGas: bigint

    constructor(_config: TransactionManagerConfig) {
        this.collectors = []
        this.viemWallet = createWalletClient({
            account: _config.account,
            transport: _config.transport,
            chain: _config.chain,
        }) as ViemWalletClient
        this.viemClient = createPublicClient({
            transport: _config.transport,
            chain: _config.chain,
        }) as ViemClient
        this.nonceManager = new NonceManager(this)
        this.gasPriceOracle = new GasPriceOracle(this)
        this.blockMonitor = new BlockMonitor(this)
        this.id = _config.id
        this.eip1559 = _config.eip1559 || opStackDefaultEIP1559Parameters
        this.abiManager = new ABIManager(_config.abis)

        this.baseFeeMargin = _config.baseFeePercentageMargin || 20n
        this.maxPriorityFeePerGas = _config.maxPriorityFeePerGas || 0n

        eventBus.on(Topics.NewBlock, this.onNewBlock.bind(this))
    }

    static async create(config: TransactionManagerConfig): Promise<TransactionManager> {
        const transactionManager = new TransactionManager(config)

        await transactionManager.start()

        return transactionManager
    }

    public addTransactionCollector(collector: TransactionCollector): void {
        this.collectors.push(collector)
    }

    public async start(): Promise<void> {
        await this.nonceManager.start()
    }

    private async onNewBlock() {
        const { maxFeePerGas, maxPriorityFeePerGas } = this.gasPriceOracle.suggestGasForNextBlock()

        const transactionsBatch = this.collectors
            .flatMap((c) => c())
            .sort((a, b) => (a.deadline ?? Number.POSITIVE_INFINITY) - (b.deadline ?? Number.POSITIVE_INFINITY))

        const entityManager = dbDriver.em.fork()

        for (const t of transactionsBatch) {
            const nonce = this.nonceManager.requestNonce()

            const abi = this.abiManager.get(t.contractName)

            if (!abi) {
                throw new Error(`ABI not found for contract ${t.contractName}`)
            }

            this.viemWallet.writeContract({
                address: t.address,
                abi: abi,
                functionName: t.functionName,
                args: t.args,
                nonce: nonce,
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: maxPriorityFeePerGas,
            })

            entityManager.persist(t)
        }
        await entityManager.flush()
    }
}
