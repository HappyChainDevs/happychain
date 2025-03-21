import { client as clientFactory, computeHappyTxHash } from "@happy.tech/submitter/client"
import { env } from "./env"

import type {
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
}

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
}

// These are exported to make ApiExtractor Happy
export { client as clientFactory, computeHappyTxHash }
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

// == Utilities ====================================================================================

function getHash(tx: Parameters<typeof computeHappyTxHash>[0]): `0x${string}` {
    return computeHappyTxHash(tx)
}

const client = clientFactory(env.SUBMITTER_URL)
export const accountApi = client.api.v1.accounts
export const submitterApi = client.api.v1.submitter

// == Account API Routes ===========================================================================

/**
 * Create a new ScrappyAccount
 * @param data User Creation Options
 * @param data.owner User EOA address
 * @param data.salt Salt for the account creation
 */
async function createAccount(data: CreateAccountParameters): Promise<CreateAccountReturnType> {
    return await accountApi.create.$post({ json: data }).then((a) => a.json())
}

// == Submit API Routes ============================================================================

/**
 * Submits a HappyTransaction to the network
 * @param data
 * @param data.entryPoint EntryPoint address
 * @param data.tx HappyTransaction to be submitted
 * @return transaction hash
 */
async function submit(data: SubmitParameters): Promise<SubmitReturnType> {
    return await submitterApi.submit.$post({ json: data }).then((a) => a.json())
}

/**
 * Submits a HappyTransaction to the network
 * @param data
 * @param data.entryPoint EntryPoint address
 * @param data.tx HappyTransaction to be submitted
 * @return receipt
 */
async function execute(data: ExecuteParameters): Promise<ExecuteReturnType> {
    return await submitterApi.execute.$post({ json: data }).then((a) => a.json())
}

/**
 * Estimates the gas for a HappyTransaction
 * @param data
 * @returns
 */
async function estimateGas(data: EstimateGasParameters): Promise<EstimateGasReturnType> {
    return await submitterApi.estimateGas.$post({ json: data }).then((a) => a.json())
}

/**
 * Get the receipt of a HappyTransaction
 * @param data
 * @returns
 */
async function state(data: StateParameters): Promise<StateReturnType> {
    return await submitterApi.state[":hash"].$get({ param: { hash: data.hash } }).then((a) => a.json())
}

/**
 * Get the receipt of a HappyTransaction, waiting if needed
 * @param data
 * @returns
 */
async function receipt(data: ReceiptParameters): Promise<ReceiptReturnType> {
    return await submitterApi.receipt[":hash"]
        .$get({ param: { hash: data.hash }, query: { timeout: data.timeout } })
        .then((a) => a.json())
}

/**
 * Get the pending transactions of an account
 * @param data
 * @returns
 */
async function pending(data: PendingParameters): Promise<PendingReturnType> {
    return await submitterApi.pending[":account"].$get({ param: { account: data.account } }).then((a) => a.json())
}
