import type { Prettify } from "@happy.tech/common"
import { client as clientFactory, computeHappyTxHash } from "submitter/client"

// Client Public Interface
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
}
export type {
    CreateAccountParameters,
    SubmitParameters,
    ExecuteParameters,
    EstimateGasParameters,
    StateParameters,
    ReceiptParameters,
    PendingParameters,
}

// == Utilities ====================================================================================

function getHash(tx: Parameters<typeof computeHappyTxHash>[0]) {
    return computeHappyTxHash(tx)
}

// == API Route Functions ==========================================================================
const client = clientFactory("http://localhost:3001")

const accountApi = client.api.v1.accounts

type CreateAccountParameters = Parameters<typeof accountApi.create.$post>[0]["json"]
async function createAccount(data: CreateAccountParameters) {
    return await accountApi.create.$post({ json: data }).then((a) => a.json())
}

const submitterApi = client.api.v1.submitter

type SubmitParameters = Parameters<typeof submitterApi.submit.$post>[0]["json"]
async function submit(data: SubmitParameters) {
    return await submitterApi.submit.$post({ json: data }).then((a) => a.json())
}

type ExecuteParameters = Parameters<typeof submitterApi.execute.$post>[0]["json"]
async function execute(data: ExecuteParameters) {
    return await submitterApi.execute.$post({ json: data }).then((a) => a.json())
}

type EstimateGasParameters = Parameters<typeof submitterApi.estimateGas.$post>[0]["json"]
async function estimateGas(data: EstimateGasParameters) {
    return await submitterApi.estimateGas.$post({ json: data }).then((a) => a.json())
}

const stateByHashRoute = submitterApi.state[":hash"]
type StateParameters = Parameters<typeof stateByHashRoute.$get>[0]["param"]
async function state(data: StateParameters) {
    return await stateByHashRoute.$get({ param: { hash: data.hash } }).then((a) => a.json())
}

const receiptByHashRoute = submitterApi.receipt[":hash"]
type ReceiptParameters = Prettify<
    Parameters<typeof receiptByHashRoute.$get>[0]["param"] & Parameters<typeof receiptByHashRoute.$get>[0]["query"]
>
async function receipt(data: ReceiptParameters) {
    return await receiptByHashRoute
        .$get({ param: { hash: data.hash }, query: { timeout: data.timeout } })
        .then((a) => a.json())
}

const pendingByAccountRoute = submitterApi.pending[":account"]
type PendingParameters = Parameters<typeof pendingByAccountRoute.$get>[0]["param"]
export async function pending(data: PendingParameters) {
    return await pendingByAccountRoute.$get({ param: { account: data.account } }).then((a) => a.json())
}
