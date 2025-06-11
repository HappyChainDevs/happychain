import { ValueType, metrics } from "@opentelemetry/api"

const submitterMeter = metrics.getMeter("submitter")

export const currentBlockGauge = submitterMeter.createGauge(
    "block-service.current-block",
    {
        description: "Current block number",
        unit: "block",
        valueType: ValueType.INT,
    },
)

export const blockExecutorJobCountGauge = submitterMeter.createGauge(
    "executor-heap.job-count",
    {
        description: "Number of jobs currently being processed for each executor",
        unit: "count",
        valueType: ValueType.INT,
    },
)

export const boopsStoredGauge = submitterMeter.createGauge(
    "boop-store.boops-stored",
    {
        description: "Number of boops currently stored in the boop store",
        unit: "count",
        valueType: ValueType.INT,
    },
)

/* Database */

export const databaseOperationsCounter = submitterMeter.createCounter("database.operations", {
    description: "Number of database operations",
    unit: "count",
    valueType: ValueType.INT,
})

export const databaseErrorsCounter = submitterMeter.createCounter("database.errors", {
    description: "Number of database errors",
    unit: "count",
    valueType: ValueType.INT,
})

export const databaseOperationDurationHistogram = submitterMeter.createHistogram(
    "database.operation-duration",
    {
        description: "Duration of database operations",
        unit: "ms",
        valueType: ValueType.INT,
    },
)

/* HTTP */

export const httpRequestsCounter = submitterMeter.createCounter("http.requests", {
    description: "Number of HTTP requests",
    unit: "count",
    valueType: ValueType.INT,
})

export const httpRequestDurationHistogram = submitterMeter.createHistogram("http.request-duration", {
    description: "Duration of HTTP requests",
    unit: "ms",
    valueType: ValueType.INT,
    advice: {
        explicitBucketBoundaries: [
            50,
            100,
            200,
            300,
            400,
            500,
            750,
            1000,
            1500,
            2000,
            2500,
            3000,
            4000,
            5000,
            7500,
            10000,
            15000,
            Number.POSITIVE_INFINITY,
        ],
    }
})

export const httpInFlightRequestsGauge = submitterMeter.createGauge("http.in-flight-requests", {
    description: "Number of HTTP requests currently in flight",
    unit: "count",
    valueType: ValueType.INT,
})

export const httpResponseSizeHistogram = submitterMeter.createHistogram("http.response-size", {
    description: "Response size in bytes",
    unit: "bytes",
    valueType: ValueType.INT,
    advice: {
        explicitBucketBoundaries: [100, 500, 1_000, 5_000, 10_000, 50_000, 100_000],
    },
})