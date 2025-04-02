import type {
    CreateAccountInput,
    CreateAccountOutput,
    EstimateGasInput,
    EstimateGasOutput,
    ExecuteInput,
    ExecuteOutput,
    PendingHappyTxInput,
    PendingHappyTxOutput,
    ReceiptInput,
    StateRequestInput,
    StateRequestOutput,
    SubmitInput,
    SubmitOutput,
} from "@happy.tech/submitter/client"
import { env } from "./env"
import { ApiClient } from "./utils/api-client"
import type { Result } from "./utils/neverthrow"

const client = new ApiClient({ baseUrl: env.SUBMITTER_URL })

// == Account API Routes ===========================================================================

export type { CreateAccountInput, CreateAccountOutput }
/**
 * Create a new ScrappyAccount
 * @param data User Creation Options
 * @param data.owner User EOA address
 * @param data.salt Salt for the account creation
 */
export async function createAccount(data: CreateAccountInput): Promise<Result<CreateAccountOutput, Error>> {
    const response = await client.post("/v1/accounts/create", data)
    return response as Result<CreateAccountOutput, Error>
}

// == Submit API Routes ============================================================================

/**
 * Submits a HappyTransaction to the network
 * @param data
 * @param data.entryPoint EntryPoint address
 * @param data.tx HappyTransaction to be submitted
 * @return transaction hash
 */
export type { SubmitInput, SubmitOutput }
export async function submit(data: SubmitInput): Promise<Result<SubmitOutput, Error>> {
    const response = await client.post("/v1/submit", data)
    return response as Result<SubmitOutput, Error>
}

/**
 * Submits a HappyTransaction to the network
 * @param data
 * @param data.entryPoint EntryPoint address
 * @param data.tx HappyTransaction to be submitted
 * @return receipt
 */
export type { ExecuteInput, ExecuteOutput }
export async function execute(data: ExecuteInput): Promise<Result<ExecuteOutput, Error>> {
    const response = await client.post("/v1/execute", data)
    return response as Result<ExecuteOutput, Error>
}

/**
 * Estimates the gas for a HappyTransaction
 * @param data
 * @returns
 */
export type { EstimateGasInput, EstimateGasOutput }
export async function estimateGas(data: EstimateGasInput): Promise<Result<EstimateGasOutput, Error>> {
    const response = await client.post("/v1/simulate", data)
    return response as Result<EstimateGasOutput, Error>
}

/**
 * Get the receipt of a HappyTransaction
 * @param data
 * @returns
 */
export type { StateRequestInput, StateRequestOutput }
export async function state({ hash }: StateRequestInput): Promise<Result<StateRequestOutput, Error>> {
    const response = await client.get(`/v1/state/${hash}`)
    return response as Result<StateRequestOutput, Error>
}

/**
 * Get the receipt of a HappyTransaction, waiting if needed
 * @param data
 * @returns
 */
export type { ReceiptInput }
export async function receipt({ hash, timeout }: ReceiptInput): Promise<Result<StateRequestOutput, Error>> {
    const response = await client.get(`/v1/receipt/${hash}`, { timeout: timeout })
    return response as Result<StateRequestOutput, Error>
}

/**
 * Get the pending transactions of an account
 * @param data
 * @returns
 */
export type { PendingHappyTxInput, PendingHappyTxOutput }
export async function pending({ account }: PendingHappyTxInput): Promise<Result<PendingHappyTxOutput, Error>> {
    const response = await client.get(`/v1/pending/${account}`)
    return response as Result<PendingHappyTxOutput, Error>
}
