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

    /*
     * Given a boop, sends it to the submitter which will either accept it and return its hash,
     * or fail with a rejection status.
     *
     * The submitter is nonce-aware and will buffer up to a certain amount of boop per nonce track,
     * depending on its configuration. It will submit boops whenever their nonces becomes eligible.
     *
     * The submitter will then attempt to submit the transaction onchain. The state of the Boop
     * can be queried with `submitter_state`.
     *
     * If the gas limits are provided, the submitter is free to perform or not perform simulation before
     * submitting.
     *
     * If the submitter already has a pending Boop with the same nonce for this account, it will
     * cancel the existing one on the condition that the new Boop passes validation. It can also
     * impose additional restrictions, such as requesting a higher submitterFee for the replacement
     * transaction.
     */
    async submit(data: SubmitInput): Promise<Result<SubmitOutput, Error>> {
        const response = await this.client.post("/api/v1/boop/submit", serializeBigInt(data))
        return response as Result<SubmitOutput, Error>
    }

    /**
     * Given a boop, submits it onchain to be executed, waits for and returns the result of
     * execution.
     *
     * Unless `data.boop.account === data.boop.payer`, the gas limit fields
     * and fee fields can be omitted and will be filled by the submitter.
     *
     * If the gas limits are provided, the submitter is free to perform or not perform simulation before
     * submitting.
     *
     * The submitter is nonce-aware and will buffer up to a certain amount of boop per nonce track,
     * depending on its configuration. It will submit boop whenever their nonces becomes eligible.
     * *
     * @param data
     * @param data.entryPoint EntryPoint address (optional)
     * @param data.boop boop to be submitted
     */
    async execute(data: ExecuteInput): Promise<Result<ExecuteOutput, Error>> {
        const response = await this.client.post("/api/v1/boop/execute", serializeBigInt(data))
        return response as Result<ExecuteOutput, Error>
    }

    /**
     * Given a boop possibly missing some gas limits or gas fee parameters, returns estimates for
     * these limits and parameters, and the result of simulation.
     *
     * Note that the boop is also allowed to be different in some way than the one for which the gas
     * values will be used, e.g. for accounts that validate a signature, the validationData could be
     * empty or include a dummy value.
     *
     * If any gas limit *is* specified, it is passed along as-is during simulation and not filled in
     * by the submitter.
     *
     * Calling this endpoint does *not* create a state for the Boop on the submitter.
     * *
     * @param data
     * @param data.entryPoint EntryPoint address (optional)
     * @param data.boop boop to be submitted
     */
    async simulate(data: SimulateInput): Promise<Result<SimulateOutput, Error>> {
        const response = await this.client.post("/api/v1/boop/simulate", serializeBigInt(data))
        return response as Result<SimulateOutput, Error>
    }

    /**
     * Returns the state of the Boop as known by the submitter.
     *
     * Depending on the submitter's state retention policies, he might not be able to answer this query,
     * even if he did see the Boop before. In this case he should answer with a status of
     * {@link StateRequestStatus.UnknownBoop}.
     */
    async state({ hash }: StateRequestInput): Promise<Result<StateRequestOutput, Error>> {
        const response = await this.client.get(`/api/v1/boop/state/${hash}`)
        return response as Result<StateRequestOutput, Error>
    }

    /**
     * Instructs the return the receipt of the boop whose hash is provided, waiting if needed.
     *
     * It may also return earlier if a user-specified or submitter-mandated timeout is reached.
     *
     * The submitter can return without a receipt if the Boop submission failed for other reasons.
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
