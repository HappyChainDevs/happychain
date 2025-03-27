// HappyClient Public Interface
export {
    // Utilities
    getHash,
    // API
    createAccount,
    submit,
    execute,
    estimateGas,
    state,
    receipt,
    pending,
} from "./client"

export type {
    CreateAccountParameters,
    CreateAccountReturnType,
    EstimateGasParameters,
    EstimateGasReturnType,
    ExecuteParameters,
    ExecuteReturnType,
    PendingParameters,
    PendingReturnType,
    ReceiptParameters,
    ReceiptReturnType,
    StateParameters,
    StateReturnType,
    SubmitParameters,
    SubmitReturnType,
} from "./types"

// These are exported to make ApiExtractor Happy
export { client as clientFactory, computeHappyTxHash } from "@happy.tech/submitter/client"
export type {
    CreateAccountResponse,
    CreateAccountRoute,
    EstimateGasResponse,
    EstimateGasRoute,
    ExecuteResponse,
    ExecuteRoute,
    PendingResponse,
    PendingRoute,
    ReceiptResponse,
    ReceiptRoute,
    StateResponse,
    StateRoute,
    SubmitResponse,
    SubmitRoute,
    Prettify,
    accountApiType,
    pendingByAccountRouteType,
    receiptByHashRouteType,
    stateByHashRouteType,
    submitterApiType,
} from "./types"
