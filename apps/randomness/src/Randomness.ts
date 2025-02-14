import crypto from "node:crypto"
import type { Hex, UUID } from "@happy.tech/common"
import { bytesToHex, encodePacked, keccak256 } from "viem"

export enum RandomnessStatus {
    /** The randomness was created but no transactions were submitted to TXM. */
    PENDING = "PENDING",
    /** The commitment transaction was submitted to the TXM. */
    COMMITMENT_SUBMITTED = "COMMITMENT_SUBMITTED",
    /** The commitment transaction was successfully executed onchain. */
    COMMITMENT_EXECUTED = "COMMITMENT_EXECUTED",
    /**
     * The commitment transaction was included onchain but the execution failed, or failed to be
     * included onchain (e.g. cancelled).
     */
    COMMITMENT_FAILED = "COMMITMENT_FAILED",
    /** The reveal transaction was submitted to TXM (requires the commitment tx to be successful). */
    REVEAL_SUBMITTED = "REVEAL_SUBMITTED",
    /** The reveal transaction was successfully executed onchain. */
    REVEAL_EXECUTED = "REVEAL_EXECUTED",
    /**
     * The reveal transaction was included onchain but the execution failed, or failed to be
     * included onchain (e.g. cancelled).
     */
    REVEAL_FAILED = "REVEAL_FAILED",
    /** The reveal transaction could not be submitted on time to TXM. */
    REVEAL_NOT_SUBMITTED_ON_TIME = "REVEAL_NOT_SUBMITTED_ON_TIME",
}

export class Randomness {
    public blockNumber: bigint
    public value: bigint
    public hashedValue: Hex
    public commitmentTransactionIntentId: UUID | undefined
    public revealTransactionIntentId: UUID | undefined
    public status: RandomnessStatus

    constructor(params: {
        blockNumber: bigint
        value: bigint
        hashedValue: Hex
        commitmentTransactionIntentId?: UUID
        revealTransactionIntentId?: UUID
        status: RandomnessStatus
    }) {
        this.blockNumber = params.blockNumber
        this.value = params.value
        this.hashedValue = params.hashedValue
        this.commitmentTransactionIntentId = params.commitmentTransactionIntentId
        this.revealTransactionIntentId = params.revealTransactionIntentId
        this.status = params.status
    }

    commitmentExecuted(): void {
        this.status = RandomnessStatus.COMMITMENT_EXECUTED
    }

    revealExecuted(): void {
        this.status = RandomnessStatus.REVEAL_EXECUTED
    }

    addCommitmentTransactionIntentId(intentId: UUID): void {
        this.commitmentTransactionIntentId = intentId
        this.status = RandomnessStatus.COMMITMENT_SUBMITTED
    }

    addRevealTransactionIntentId(intentId: UUID): void {
        this.revealTransactionIntentId = intentId
        this.status = RandomnessStatus.REVEAL_SUBMITTED
    }

    commitmentFailed(): void {
        this.status = RandomnessStatus.COMMITMENT_FAILED
    }

    revealFailed(): void {
        this.status = RandomnessStatus.REVEAL_FAILED
    }

    revealNotSubmittedOnTime(): void {
        this.status = RandomnessStatus.REVEAL_NOT_SUBMITTED_ON_TIME
    }

    static createRandomness(blockNumber: bigint): Randomness {
        const value = Randomness.generateValue()
        const hashedValue = Randomness.hashValue(value)
        return new Randomness({
            blockNumber,
            value,
            hashedValue,
            commitmentTransactionIntentId: undefined,
            revealTransactionIntentId: undefined,
            status: RandomnessStatus.PENDING,
        })
    }

    private static generateValue(): bigint {
        const bytes = crypto.randomBytes(16)

        return BigInt(bytesToHex(bytes))
    }

    private static hashValue(value: bigint): Hex {
        return keccak256(encodePacked(["uint128"], [value]))
    }
}
