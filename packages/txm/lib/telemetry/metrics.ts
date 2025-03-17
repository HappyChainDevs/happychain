import { ValueType, metrics } from "@opentelemetry/api"

/* General metrics */

const generalMeter = metrics.getMeter("txm.general")

export const blockchainRpcResponseTimeHistogram = generalMeter.createHistogram(
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

export const rpcCounter = generalMeter.createCounter("txm.general.rpc", {
    description: "Number of requests sent to the blockchain",
    unit: "count",
    valueType: ValueType.INT,
})

export const rpcErrorCounter = generalMeter.createCounter("txm.general.rpc-error", {
    description: "Number of errors that occurred while sending requests to the blockchain",
    unit: "count",
    valueType: ValueType.INT,
})

/* NONCE MANAGER METRICS */

const nonceManagerMeter = metrics.getMeter("txm.nonce-manager")

export const nonceManagerGauge = nonceManagerMeter.createGauge("txm.nonce-manager.nonce", {
    description: "Current nonce",
    unit: "count",
    valueType: ValueType.INT,
})

export const returnedNonceCounter = nonceManagerMeter.createCounter("txm.nonce-manager.returned-nonce", {
    description: "Number of transaction nonces that were reserved but returned to the queue",
    unit: "count",
    valueType: ValueType.INT,
})

export const returnedNonceQueueGauge = nonceManagerMeter.createGauge("txm.nonce-manager.returned-nonce-queue", {
    description: "Quantity of returned nonces in the queue",
    unit: "count",
    valueType: ValueType.INT,
})

/* TRANSACTION COLLECTOR METRICS */

const transactionCollectorMeter = metrics.getMeter("txm.transaction-collector")

export const transactionCollectedCounter = transactionCollectorMeter.createCounter("txm.collector.count", {
    description: "Number of transactions collected",
    unit: "count",
    valueType: ValueType.INT,
})

/* TRANSACTION REPOSITORY METRICS */

const transactionRepositoryMeter = metrics.getMeter("txm.transaction-repository")

export const notFinalizedTransactionsGauge = transactionRepositoryMeter.createGauge(
    "txm.transaction-repository.not-finalized-transactions",
    {
        description: "Quantity of transactions in the repository that are not finalized",
        unit: "count",
        valueType: ValueType.INT,
    },
)

/* TRANSACTION METRICS */

const transactionMeter = metrics.getMeter("txm.transaction")

export const transactionStatusChangeCounter = transactionMeter.createCounter("txm.transaction.status-change", {
    description: "Count of transactions transitioning to a different status",
    unit: "count",
    valueType: ValueType.INT,
})

export const attemptsUntilFinalization = transactionMeter.createHistogram(
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

const blockMonitorMeter = metrics.getMeter("txm.block-monitor")

export const currentBlockGauge = blockMonitorMeter.createGauge("txm.block-monitor.current-block", {
    description: "Current block number",
    unit: "count",
    valueType: ValueType.INT,
})

export const newBlockDelayHistogram = blockMonitorMeter.createHistogram("txm.block-monitor.new-block-delay", {
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
})

export const resetBlockMonitorCounter = blockMonitorMeter.createCounter("txm.block-monitor.reset", {
    description: "Number of times the block monitor has been reset",
    unit: "count",
    valueType: ValueType.INT,
})

/* TX MONITOR METRICS */

const txMonitorMeter = metrics.getMeter("txm.tx-monitor")

export const transactionsRetriedCounter = txMonitorMeter.createCounter("txm.tx-monitor.transactions-retried", {
    description: "Number of transactions retried",
    unit: "count",
    valueType: ValueType.INT,
})

export const transactionInclusionBlockHistogram = txMonitorMeter.createHistogram(
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

const databaseMeter = metrics.getMeter("txm.database")

export const databaseOperationsCounter = databaseMeter.createCounter("txm.database.operations", {
    description: "Number of database operations",
    unit: "count",
    valueType: ValueType.INT,
})

export const databaseErrorsCounter = databaseMeter.createCounter("txm.database.errors", {
    description: "Number of database errors",
    unit: "count",
    valueType: ValueType.INT,
})

export const databaseOperationDurationHistogram = databaseMeter.createHistogram("txm.database.operation-duration", {
    description: "Duration of database operations",
    unit: "ms",
    valueType: ValueType.INT,
})
