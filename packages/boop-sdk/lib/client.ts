import type {
    CreateAccountInput,
    CreateAccountOutput,
    ExecuteInput,
    ExecuteOutput,
    PendingBoopInput,
    PendingBoopOutput,
    ReceiptInput,
    SimulationInput,
    SimulationOutput,
    StateRequestInput,
    StateRequestOutput,
    SubmitInput,
    SubmitOutput,
} from "@happy.tech/submitter/client"
import { serializeBigInt } from "@happy.tech/submitter/client"
import { env } from "./env"
import { ApiClient } from "./utils/api-client"
import type { Result } from "./utils/neverthrow"

const client = new ApiClient({ baseUrl: env.SUBMITTER_URL })

// == Account API Routes ===========================================================================

export type { CreateAccountInput, CreateAccountOutput }
/**
 * Create a new HappyAccount. If the account already exists, it will be returned.
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
 * Submits a Boop to the network
 * @param data
 * @param data.entryPoint EntryPoint address
 * @param data.tx Boop to be submitted
 * @return transaction hash
 */
export type { SubmitInput, SubmitOutput }
export async function submit(data: SubmitInput): Promise<Result<SubmitOutput, Error>> {
    const response = await client.post("/v1/boop/submit", serializeBigInt(data))
    return response as Result<SubmitOutput, Error>
}

/**
 * Submits a Boop to the network
 * @param data
 * @param data.entryPoint EntryPoint address
 * @param data.tx Boop to be submitted
 * @return receipt
 */
export type { ExecuteInput, ExecuteOutput }
export async function execute(data: ExecuteInput): Promise<Result<ExecuteOutput, Error>> {
    const response = await client.post("/v1/boop/execute", serializeBigInt(data))
    return response as Result<ExecuteOutput, Error>
}

/**
 * Estimates the gas for a Boop
 * @param data
 * @returns
 */
export type { SimulationInput, SimulationOutput }
export async function simulate(data: SimulationInput): Promise<Result<SimulationOutput, Error>> {
    const response = await client.post("/v1/boop/simulate", serializeBigInt(data))
    return response as Result<SimulationOutput, Error>
}

/**
 * Get the receipt of a Boop
 * @param data
 * @returns
 */
export type { StateRequestInput, StateRequestOutput }
export async function state({ hash }: StateRequestInput): Promise<Result<StateRequestOutput, Error>> {
    const response = await client.get(`/v1/boop/state/${hash}`)
    return response as Result<StateRequestOutput, Error>
}

/**
 * Get the receipt of a Boop, waiting if needed
 * @param data
 * @returns
 */
export type { ReceiptInput }
export async function receipt({ hash, timeout }: ReceiptInput): Promise<Result<StateRequestOutput, Error>> {
    const response = await client.get(`/v1/boop/receipt/${hash}`, { timeout: timeout })
    return response as Result<StateRequestOutput, Error>
}

/**
 * Get the pending Boops of an account
 * @param data
 * @returns
 */
export type { PendingBoopInput, PendingBoopOutput }
export async function pending({ account }: PendingBoopInput): Promise<Result<PendingBoopOutput, Error>> {
    const response = await client.get(`/v1/boop/pending/${account}`)
    return response as Result<PendingBoopOutput, Error>
}
