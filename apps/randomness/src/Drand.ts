import type { Hex, UUID } from "@happy.tech/common"

export enum DrandStatus {
    PENDING = "PENDING",
    SUBMITTED = "SUBMITTED",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
}

export class Drand {
    #round: bigint
    #signature: Hex
    #status: DrandStatus
    #transactionIntentId: UUID | undefined

    static readonly validTransitions: Record<DrandStatus, DrandStatus[]> = {
        PENDING: [DrandStatus.SUBMITTED, DrandStatus.FAILED],
        SUBMITTED: [DrandStatus.SUCCESS, DrandStatus.FAILED],
        SUCCESS: [],
        FAILED: [],
    }

    constructor(params: {
        status: DrandStatus
        transactionIntentId?: UUID
        round: bigint
        signature: Hex
    }) {
        this.#status = params.status
        this.#transactionIntentId = params.transactionIntentId
        this.#round = params.round
        this.#signature = params.signature
    }

    private setStatus(newStatus: DrandStatus): void {
        if (!Drand.validTransitions[this.#status].includes(newStatus)) {
            throw new Error(`Invalid status transition from ${this.#status} to ${newStatus}`)
        }

        this.#status = newStatus
    }

    executionSuccess(): void {
        this.setStatus(DrandStatus.SUCCESS)
    }

    transactionSubmitted(): void {
        this.setStatus(DrandStatus.SUBMITTED)
    }

    transactionFailed(): void {
        this.setStatus(DrandStatus.FAILED)
    }

    get round(): bigint {
        return this.#round
    }

    get signature(): Hex | undefined {
        return this.#signature
    }

    get status(): DrandStatus {
        return this.#status
    }

    get transactionIntentId(): UUID | undefined {
        return this.#transactionIntentId
    }

    static create(params: {
        transactionIntentId?: UUID
        round: bigint
        signature: Hex
    }): Drand {
        // Signature is a hex string with 128 characters + 2 for the "0x" prefix
        if (params.signature.length !== 130) {
            throw new Error("Invalid signature length")
        }

        if (!params.signature.startsWith("0x")) {
            throw new Error("Signature must start with 0x")
        }

        if (params.round <= 0n) {
            throw new Error("Round must be greater than 0")
        }

        return new Drand({
            status: DrandStatus.PENDING,
            round: params.round,
            signature: params.signature,
            transactionIntentId: params.transactionIntentId,
        })
    }
}
