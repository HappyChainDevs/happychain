import { type Address, type Hash, type Hex, type Override, serializeBigInt } from "@happy.tech/common"
import { deployment as happyChainSepoliaDeployment } from "@happy.tech/contracts/boop/sepolia"
import {
    type Boop,
    type BoopReceipt,
    type BoopWithOptionalFields,
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
    type SimulateSuccess,
    type SubmitInput,
    type SubmitOutput,
    type SimulateOutput as SubmitterSimulateOutput,
    type WaitForReceiptInput,
    type WaitForReceiptOutput,
    computeBoopHash,
    decodeBoop,
    encodeBoop,
} from "@happy.tech/submitter/client"
import type { GetNonceInput, GetNonceOutput } from "./types/GetNonce"
import { ApiClient } from "./utils/apiClient"
import { getNonce } from "./utils/getNonce"

export type SubmitClientInput = Override<SubmitInput, { boop: BoopWithOptionalFields }>
export type ExecuteClientInput = Override<ExecuteInput, { boop: BoopWithOptionalFields }>
export type SimulateClientInput = Override<SimulateInput, { boop: BoopWithOptionalFields }>

export type BoopClientConfig = {
    submitterUrl: string
    rpcUrl: string
    entryPoint: Address
}

export class BoopClient {
    #client: ApiClient
    #config: BoopClientConfig

    constructor(config?: Partial<BoopClientConfig>) {
        this.#config = this.#applyDefaults(config)
        this.#client = new ApiClient({ submitterUrl: this.#config.submitterUrl })
    }

    #applyDefaults(config?: Partial<BoopClientConfig>): BoopClientConfig {
        return {
            submitterUrl: config?.submitterUrl ?? "https://submitter.happy.tech",
            rpcUrl: config?.rpcUrl ?? "https://rpc.testnet.happy.tech/http",
            entryPoint: config?.entryPoint ?? happyChainSepoliaDeployment.EntryPoint,
        }
    }

    // == Account API Routes ===========================================================================

    /**
     * Create a new HappyAccount. If the account already exists, it will be returned.
     */
    async createAccount(data: CreateAccountInput): Promise<CreateAccountOutput> {
        const response = await this.#client.post("/api/v1/accounts/create", data)
        return response as CreateAccountOutput
    }

    /**
     * Fetches an accounts nonce.
     */
    async getNonce(data: GetNonceInput): Promise<GetNonceOutput> {
        const response = await getNonce(this.#config.rpcUrl, this.#config.entryPoint, data)
        return response as GetNonceOutput
    }

    // == Submit API Routes ============================================================================

    /**
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
    async submit(data: SubmitClientInput): Promise<SubmitOutput> {
        const response = await this.#client.post("/api/v1/boop/submit", serializeBigInt(data))
        return this.#getSubmitOutput(response)
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
     */
    async execute(data: ExecuteClientInput): Promise<ExecuteOutput> {
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
     */
    async simulate(data: SimulateInput): Promise<SimulateOutput> {
        const response = await this.#client.post("/api/v1/boop/simulate", serializeBigInt(data))
        return this.#getSimulateOutput(response)
    }

    /**
     * Utility function to accept a successful simulation and return the boop with updated gas values.
     */
    updateBoopFromSimulation(boop: Boop, simulation: SimulateSuccess): Boop {
        return {
            ...boop,
            gasLimit: simulation.gas,
            validateGasLimit: simulation.validateGas,
            validatePaymentGasLimit: simulation.validatePaymentGas,
            executeGasLimit: simulation.executeGas,
            maxFeePerGas: simulation.maxFeePerGas,
            submitterFee: simulation.submitterFee,
        }
    }

    /**
     * Returns the state of the Boop as known by the submitter.
     *
     * Depending on the submitter's state retention policies, he might not be able to answer this query,
     * even if he did see the Boop before. In this case he should answer with a status of
     * {@link GetState.UnknownBoop}.
     */
    async getState(data: GetStateInput): Promise<GetStateOutput> {
        const { boopHash } = data
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
    async waitForReceipt(data: WaitForReceiptInput): Promise<WaitForReceiptOutput> {
        const { boopHash, timeout } = data
        const response = await this.#client.get(`/api/v1/boop/receipt/${boopHash}`, { timeout })
        return this.#getReceiptOutput(response)
    }

    /**
     * Returns a list of pending (not yet included on chain) boops for the given account, identified by their hash and
     * nonce.
     */
    async getPending({ account }: GetPendingInput): Promise<GetPendingOutput> {
        const response = await this.#client.get(`/api/v1/boop/pending/${account}`)
        return this.#getPendingOutput(response)
    }

    /** {@inheritDoc encodeBoop} */
    encode(boop: BoopWithOptionalFields): Hex {
        return encodeBoop(boop)
    }

    /** {@inheritDoc decodeBoop} */
    decode(boop: Hex): Boop {
        return decodeBoop(boop)
    }

    /** {@inheritDoc computeBoopHash} */
    computeBoopHash(chainId: number, boop: BoopWithOptionalFields): Hash {
        return computeBoopHash(chainId, boop)
    }

    // == Formatting Utils =========================================================================

    #getSubmitOutput(response: unknown): SubmitOutput {
        return response as SubmitOutput
    }

    #getExecuteOutput(response: unknown): ExecuteOutput {
        const output = response as ExecuteOutput
        if (!("receipt" in output) || !output.receipt) return output

        return {
            ...output,
            receipt: this.#getBoopReceiptOutput(output.receipt),
        }
    }

    #getSimulateOutput(response: unknown): SubmitterSimulateOutput {
        const output = response as SubmitterSimulateOutput
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
