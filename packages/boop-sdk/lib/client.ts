import { type Address, serializeBigInt } from "@happy.tech/common"
import {
    type BoopReceipt,
    type CreateAccountInput,
    type CreateAccountOutput,
    type ExecuteInput,
    type ExecuteOutput,
    GetPending,
    type GetPendingInput,
    type GetPendingOutput,
    type GetStateInput,
    type GetStateOutput,
    Onchain,
    type SimulateInput,
    type SimulateOutput,
    type SubmitInput,
    type EntryPointOutput,
    type WaitForReceiptInput,
    type WaitForReceiptOutput,
} from "@happy.tech/submitter/client"
import { env } from "./env"
import { ApiClient } from "./utils/apiClient"
import { type GetNonceInput, type GetNonceOutput, getNonce } from "./utils/getNonce"

export type BoopClientConfig = {
    baseUrl: string
    rpcUrl: string
    entryPoint: Address
}

export class BoopClient {
    #client: ApiClient
    #config: BoopClientConfig
    constructor(config?: Partial<BoopClientConfig>) {
        this.#config = this.#applyDefaults(config)
        this.#client = new ApiClient({ baseUrl: this.#config.baseUrl })
    }

    #applyDefaults(config?: Partial<BoopClientConfig>): BoopClientConfig {
        return {
            baseUrl: config?.baseUrl ?? env.SUBMITTER_URL,
            rpcUrl: config?.rpcUrl ?? env.RPC_URL,
            entryPoint: config?.entryPoint ?? env.ENTRYPOINT,
        }
    }

    // == Account API Routes ===========================================================================
    /**
     * Create a new HappyAccount. If the account already exists, it will be returned.
     * @param data User Creation Options
     * @param data.owner User EOA address
     * @param data.salt Salt for the account creation
     */
    async createAccount(data: CreateAccountInput): Promise<CreateAccountOutput> {
        const response = await this.#client.post("/api/v1/accounts/create", data)
        return response as CreateAccountOutput
    }

    /**
     * Fetches an accounts nonce.
     * @param data Nonce Fetch Options
     * @param data.address Account address
     * @param data.nonceTrack Nonce track
     */
    async getNonce(data: GetNonceInput): Promise<GetNonceOutput> {
        const response = await getNonce(this.#config.rpcUrl, this.#config.entryPoint, data)
        return response as GetNonceOutput
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
    async submit(data: SubmitInput): Promise<EntryPointOutput> {
        const response = await this.#client.post("/api/v1/boop/submit", serializeBigInt(data))
        return this.#getEntryPointOutput(response)
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
    async execute(data: ExecuteInput): Promise<ExecuteOutput> {
        const response = await this.#client.post("/api/v1/boop/execute", serializeBigInt(data))
        return this.#getExecuteOutput(response)
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
    async simulate(data: SimulateInput): Promise<SimulateOutput> {
        const response = await this.#client.post("/api/v1/boop/simulate", serializeBigInt(data))
        return this.#getSimulateOutput(response)
    }

    /**
     * Returns the state of the Boop as known by the submitter.
     *
     * Depending on the submitter's state retention policies, he might not be able to answer this query,
     * even if he did see the Boop before. In this case he should answer with a status of
     * {@link GetState.UnknownBoop}.
     */
    async getState({ boopHash }: GetStateInput): Promise<GetStateOutput> {
        const response = await this.#client.get(`/api/v1/boop/state/${boopHash}`)
        return this.#getStateOutput(response)
    }

    /**
     * Instructs the return the receipt of the boop whose hash is provided, waiting if needed.
     *
     * It may also return earlier if a user-specified or submitter-mandated timeout is reached.
     *
     * The submitter can return without a receipt if the Boop submission failed for other reasons.
     */
    async waitForReceipt({ boopHash, timeout }: WaitForReceiptInput): Promise<WaitForReceiptOutput> {
        const response = await this.#client.get(`/api/v1/boop/receipt/${boopHash}`, { timeout: timeout })
        return this.#getReceiptOutput(response)
    }

    /**
     * Returns a list of pending (not yet included on chain) boops for the given account, identified by their hash and
     * nonce.
     * @param data
     * @returns
     */
    async getPending({ account }: GetPendingInput): Promise<GetPendingOutput> {
        const response = await this.#client.get(`/api/v1/boop/pending/${account}`)
        return this.#getPendingOutput(response)
    }

    // == Formatting Utils =========================================================================

    #getEntryPointOutput(response: unknown): EntryPointOutput {
        return response as EntryPointOutput
    }

    #getExecuteOutput(response: unknown): ExecuteOutput {
        const output = response as ExecuteOutput
        if (!("receipt" in output) || !output.receipt) return output

        return {
            ...output,
            receipt: this.#getBoopReceiptOutput(output.receipt),
        }
    }

    #getSimulateOutput(response: unknown): SimulateOutput {
        const output = response as SimulateOutput
        if (output?.status !== Onchain.Success) return output
        return {
            ...output,
            maxFeePerGas: BigInt(output.maxFeePerGas),
            submitterFee: BigInt(output.submitterFee),
        }
    }

    #getStateOutput(response: unknown): GetStateOutput {
        const output = response as GetStateOutput

        if ("receipt" in output && output.receipt) {
            return {
                ...output,
                receipt: this.#getBoopReceiptOutput(output.receipt),
            }
        }

        if ("simulation" in output && output.simulation) {
            return {
                ...output,
                simulation: this.#getSimulateOutput(output.simulation),
            }
        }

        return output
    }

    #getReceiptOutput(response: unknown): WaitForReceiptOutput {
        const output = response as WaitForReceiptOutput

        if ("receipt" in output && output.receipt) {
            return {
                ...output,
                receipt: this.#getBoopReceiptOutput(output.receipt),
            }
        }

        return output
    }

    #getPendingOutput(response: unknown): GetPendingOutput {
        const output = response as GetPendingOutput
        if (output.status !== GetPending.Success) return output
        return {
            ...output,
            pending: output.pending.map((pending) => ({
                ...pending,
                nonceTrack: BigInt(pending.nonceTrack),
                nonceValue: BigInt(pending.nonceValue),
            })),
        }
    }

    #getBoopReceiptOutput(receipt: BoopReceipt): BoopReceipt {
        return {
            ...receipt,
            blockNumber: BigInt(receipt.blockNumber),
            gasPrice: BigInt(receipt.gasPrice),
            boop: {
                ...receipt.boop,
                nonceTrack: BigInt(receipt.boop.nonceTrack),
                nonceValue: BigInt(receipt.boop.nonceValue),
            },
        }
    }
}
