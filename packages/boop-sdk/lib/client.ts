import { serializeBigInt } from "@happy.tech/common"
import type {
    CreateAccountInput,
    CreateAccountOutput,
    ExecuteInput,
    ExecuteOutput,
    PendingBoopInput,
    PendingBoopOutput,
    ReceiptRequestInput,
    ReceiptRequestOutput,
    SimulateInput,
    SimulateOutput,
    StateRequestInput,
    StateRequestOutput,
    SubmitInput,
    SubmitOutput,
} from "@happy.tech/submitter/client"
import { env } from "./env"
import { ApiClient } from "./utils/api-client"
import type { Result } from "./utils/neverthrow"

export type BoopClientConfig = {
    baseUrl: string
}

export class BoopClient {
    private client: ApiClient
    constructor(config?: Partial<BoopClientConfig>) {
        const { baseUrl } = this.#applyDefaults(config)
        this.client = new ApiClient({ baseUrl })
    }

    #applyDefaults(config?: Partial<BoopClientConfig>): BoopClientConfig {
        return {
            baseUrl: config?.baseUrl ?? env.SUBMITTER_URL,
        }
    }

    // == Account API Routes ===========================================================================
    /**
     * Create a new HappyAccount. If the account already exists, it will be returned.
     * @param data User Creation Options
     * @param data.owner User EOA address
     * @param data.salt Salt for the account creation
     */
    async createAccount(data: CreateAccountInput): Promise<Result<CreateAccountOutput, Error>> {
        const response = await this.client.post("/api/v1/accounts/create", data)
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
    async submit(data: SubmitInput): Promise<Result<SubmitOutput, Error>> {
        const response = await this.client.post("/api/v1/boop/submit", serializeBigInt(data))
        return response as Result<SubmitOutput, Error>
    }

    /**
     * Submits a Boop to the network
     * @param data
     * @param data.entryPoint EntryPoint address
     * @param data.tx Boop to be submitted
     * @return receipt
     */
    async execute(data: ExecuteInput): Promise<Result<ExecuteOutput, Error>> {
        const response = await this.client.post("/api/v1/boop/execute", serializeBigInt(data))
        return response as Result<ExecuteOutput, Error>
    }

    /**
     * Estimates the gas for a Boop
     * @param data
     * @returns
     */
    async simulate(data: SimulateInput): Promise<Result<SimulateOutput, Error>> {
        const response = await this.client.post("/api/v1/boop/simulate", serializeBigInt(data))
        return response as Result<SimulateOutput, Error>
    }

    /**
     * Get the receipt of a Boop
     * @param data
     * @returns
     */
    async state({ hash }: StateRequestInput): Promise<Result<StateRequestOutput, Error>> {
        const response = await this.client.get(`/api/v1/boop/state/${hash}`)
        return response as Result<StateRequestOutput, Error>
    }

    /**
     * Get the receipt of a Boop, waiting if needed
     * @param data
     * @returns
     */
    async receipt({ hash, timeout }: ReceiptRequestInput): Promise<Result<ReceiptRequestOutput, Error>> {
        const response = await this.client.get(`/api/v1/boop/receipt/${hash}`, { timeout: timeout })
        return response as Result<ReceiptRequestOutput, Error>
    }

    /**
     * Get the pending Boops of an account
     * @param data
     * @returns
     */
    async pending({ account }: PendingBoopInput): Promise<Result<PendingBoopOutput, Error>> {
        const response = await this.client.get(`/api/v1/boop/pending/${account}`)
        return response as Result<PendingBoopOutput, Error>
    }
}
