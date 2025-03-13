import { ValueType, metrics } from "@opentelemetry/api"

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
