import type { Hex, UUID } from "@happychain/common"

export enum DrandStatus {
    PENDING = "PENDING",
    SUBMITTED = "SUBMITTED",
    EXECUTED = "EXECUTED",
    THIRDPARTY_EXECUTED = "THIRDPARTY_EXECUTED",
    FAILED = "FAILED",
}

export class Drand {
    public round: bigint
    public signature: Hex | undefined
    public status: DrandStatus
    public transactionIntentId: UUID | undefined

    constructor(params: {
        status: DrandStatus
        transactionIntentId?: UUID
        round: bigint
        signature?: Hex
    }) {
        this.status = params.status
        this.transactionIntentId = params.transactionIntentId
        this.round = params.round
        this.signature = params.signature
    }

    public executionSuccess(): void {
        this.status = DrandStatus.EXECUTED
    }

    public transactionSubmitted(): void {
        this.status = DrandStatus.SUBMITTED
    }

    public transactionFailed(): void {
        this.status = DrandStatus.FAILED
    }

    static createDrand(params: {
        transactionIntentId?: UUID
        round: bigint
        signature: Hex
    }): Drand {
        return new Drand({
            status: DrandStatus.PENDING,
            round: params.round,
            signature: params.signature,
            transactionIntentId: params.transactionIntentId,
        })
    }

    static createDrandThirdPartyExecuted(params: {
        round: bigint
    }): Drand {
        return new Drand({
            status: DrandStatus.THIRDPARTY_EXECUTED,
            round: params.round,
        })
    }
}
