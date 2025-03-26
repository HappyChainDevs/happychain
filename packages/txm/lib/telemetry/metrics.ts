import { ValueType, metrics } from "@opentelemetry/api"

export class TxmMetrics {
    /* General metrics */
    private readonly generalMeter = metrics.getMeter("txm.general")

    public readonly blockchainRpcResponseTimeHistogram = this.generalMeter.createHistogram(
        "txm.general.blockchain-rpc-response-time",
        {
            description: "Elapsed time between sending a request to the blockchain and receiving its response",
            unit: "ms",
            valueType: ValueType.INT,
            advice: {
                explicitBucketBoundaries: [
                    100,
                    200,
                    300,
                    400,
                    500,
                    600,
                    700,
                    800,
                    900,
                    1000,
                    1250,
                    1500,
                    1750,
                    2000,
                    4000,
                    Number.POSITIVE_INFINITY,
                ],
            },
        },
    )

    public readonly rpcCounter = this.generalMeter.createCounter("txm.general.rpc", {
        description: "Number of requests sent to the blockchain",
        unit: "count",
        valueType: ValueType.INT,
    })

    public readonly rpcErrorCounter = this.generalMeter.createCounter("txm.general.rpc-error", {
        description: "Number of errors that occurred while sending requests to the blockchain",
        unit: "count",
        valueType: ValueType.INT,
    })

    /* NONCE MANAGER METRICS */
    private readonly nonceManagerMeter = metrics.getMeter("txm.nonce-manager")

    public readonly nonceManagerGauge = this.nonceManagerMeter.createGauge("txm.nonce-manager.nonce", {
        description: "Current nonce",
        unit: "count",
        valueType: ValueType.INT,
    })

    public readonly returnedNonceCounter = this.nonceManagerMeter.createCounter("txm.nonce-manager.returned-nonce", {
        description: "Number of transaction nonces that were reserved but returned to the queue",
        unit: "count",
        valueType: ValueType.INT,
    })

    public readonly returnedNonceQueueGauge = this.nonceManagerMeter.createGauge(
        "txm.nonce-manager.returned-nonce-queue",
        {
            description: "Quantity of returned nonces in the queue",
            unit: "count",
            valueType: ValueType.INT,
        },
    )

    /* TRANSACTION COLLECTOR METRICS */
    private readonly transactionCollectorMeter = metrics.getMeter("txm.transaction-collector")

    public readonly transactionCollectedCounter = this.transactionCollectorMeter.createCounter("txm.collector.count", {
        description: "Number of transactions collected",
        unit: "count",
        valueType: ValueType.INT,
    })

    /* TRANSACTION REPOSITORY METRICS */
    private readonly transactionRepositoryMeter = metrics.getMeter("txm.transaction-repository")

    public readonly notFinalizedTransactionsGauge = this.transactionRepositoryMeter.createGauge(
        "txm.transaction-repository.not-finalized-transactions",
        {
            description: "Quantity of transactions in the repository that are not finalized",
            unit: "count",
            valueType: ValueType.INT,
        },
    )

    /* TRANSACTION METRICS */
    private readonly transactionMeter = metrics.getMeter("txm.transaction")

    public readonly transactionStatusChangeCounter = this.transactionMeter.createCounter(
        "txm.transaction.status-change",
        {
            description: "Count of transactions transitioning to a different status",
            unit: "count",
            valueType: ValueType.INT,
        },
    )

    public readonly attemptsUntilFinalization = this.transactionMeter.createHistogram(
        "txm.transaction.attempts-until-finalization",
        {
            description: "Count of attempts until a transaction is finalized",
            unit: "count",
            valueType: ValueType.INT,
            advice: {
                explicitBucketBoundaries: [
                    1,
                    2,
                    3,
                    4,
                    5,
                    6,
                    7,
                    8,
                    9,
                    10,
                    20,
                    40,
                    60,
                    80,
                    100,
                    200,
                    300,
                    Number.POSITIVE_INFINITY,
                ],
            },
        },
    )

    /* Block Monitor Metrics */
    private readonly blockMonitorMeter = metrics.getMeter("txm.block-monitor")

    public readonly currentBlockGauge = this.blockMonitorMeter.createGauge("txm.block-monitor.current-block", {
        description: "Current block number",
        unit: "count",
        valueType: ValueType.INT,
    })

    public readonly newBlockDelayHistogram = this.blockMonitorMeter.createHistogram(
        "txm.block-monitor.new-block-delay",
        {
            description: "Time delay between when a block is generated and when it is received",
            unit: "ms",
            valueType: ValueType.INT,
            advice: {
                explicitBucketBoundaries: [
                    100,
                    200,
                    300,
                    400,
                    500,
                    600,
                    700,
                    800,
                    900,
                    1000,
                    1250,
                    1500,
                    1750,
                    2000,
                    4000,
                    Number.POSITIVE_INFINITY,
                ],
            },
        },
    )

    public readonly resetBlockMonitorCounter = this.blockMonitorMeter.createCounter("txm.block-monitor.reset", {
        description: "Number of times the block monitor has been reset",
        unit: "count",
        valueType: ValueType.INT,
    })

    /* TX MONITOR METRICS */
    private readonly txMonitorMeter = metrics.getMeter("txm.tx-monitor")

    public readonly transactionsRetriedCounter = this.txMonitorMeter.createCounter(
        "txm.tx-monitor.transactions-retried",
        {
            description: "Number of transactions retried",
            unit: "count",
            valueType: ValueType.INT,
        },
    )

    public readonly transactionInclusionBlockHistogram = this.txMonitorMeter.createHistogram(
        "txm.tx-monitor.transaction-inclusion-block",
        {
            description: "Number of blocks it takes for a transaction to be included",
            unit: "count",
            valueType: ValueType.INT,
            advice: {
                explicitBucketBoundaries: [
                    1,
                    2,
                    3,
                    4,
                    5,
                    6,
                    7,
                    8,
                    9,
                    10,
                    20,
                    40,
                    60,
                    80,
                    100,
                    200,
                    300,
                    Number.POSITIVE_INFINITY,
                ],
            },
        },
    )

    /* Database Metrics */
    private readonly databaseMeter = metrics.getMeter("txm.database")

    public readonly databaseOperationsCounter = this.databaseMeter.createCounter("txm.database.operations", {
        description: "Number of database operations",
        unit: "count",
        valueType: ValueType.INT,
    })

    public readonly databaseErrorsCounter = this.databaseMeter.createCounter("txm.database.errors", {
        description: "Number of database errors",
        unit: "count",
        valueType: ValueType.INT,
    })

    public readonly databaseOperationDurationHistogram = this.databaseMeter.createHistogram(
        "txm.database.operation-duration",
        {
            description: "Duration of database operations",
            unit: "ms",
            valueType: ValueType.INT,
        },
    )

    /* OS Metrics */
    private readonly osMeter = metrics.getMeter("txm.os")

    public readonly heapUsedGauge = this.osMeter.createObservableGauge("txm.os.heap-used", {
        description: "Heap used in bytes",
        unit: "bytes",
        valueType: ValueType.INT,
    })

    public readonly heapTotalGauge = this.osMeter.createObservableGauge("txm.os.heap-total", {
        description: "Heap total in bytes",
        unit: "bytes",
        valueType: ValueType.INT,
    })

    public readonly processUptimeGauge = this.osMeter.createObservableGauge("txm.os.process-uptime", {
        description: "Process uptime in seconds",
        unit: "seconds",
        valueType: ValueType.INT,
    })

    public readonly processCpuUsageGauge = this.osMeter.createObservableGauge("txm.os.process-cpu-usage", {
        description: "Process CPU usage in percentage",
        unit: "%",
        valueType: ValueType.INT,
    })

    /* RPC LIVENESS MONITOR METRICS */
    private readonly rpcLivenessMonitorMeter = metrics.getMeter("txm.rpc-liveness-monitor")

    public readonly rpcLivenessMonitorGauge = this.rpcLivenessMonitorMeter.createGauge(
        "txm.rpc-liveness-monitor.is-alive",
        {
            description: "Whether the RPC is alive",
        },
    )

    // Singleton instance
    private static instance: TxmMetrics

    private constructor() {
        this.heapUsedGauge.addCallback((result) => {
            result.observe(process.memoryUsage().heapUsed)
        })

        this.heapTotalGauge.addCallback((result) => {
            result.observe(process.memoryUsage().heapTotal)
        })

        this.processUptimeGauge.addCallback((result) => {
            result.observe(process.uptime())
        })
    }

    public static getInstance(): TxmMetrics {
        if (!TxmMetrics.instance) {
            TxmMetrics.instance = new TxmMetrics()
        }
        return TxmMetrics.instance
    }
}
