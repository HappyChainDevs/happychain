import crypto from "node:crypto"
import type { Hex, UUID } from "@happychain/common"
import { encodePacked, keccak256 } from "viem"

export enum RandomnessStatus {
    PENDING = "PENDING",
    COMMITMENT_SUBMITTED = "COMMITMENT_SUBMITTED",
    COMMITMENT_EXECUTED = "COMMITMENT_EXECUTED",
    COMMITMENT_FAILED = "COMMITMENT_FAILED",
    REVEAL_SUBMITTED = "REVEAL_SUBMITTED",
    REVEAL_EXECUTED = "REVEAL_EXECUTED",
    REVEAL_FAILED = "REVEAL_FAILED",
    REVEAL_NOT_SUBMITTED_ON_TIME = "REVEAL_NOT_SUBMITTED_ON_TIME",
}

export class Randomness {
    public timestamp: bigint
    public value: bigint
    public hashedValue: Hex
    public commitmentTransactionIntentId: UUID | undefined
    public revealTransactionIntentId: UUID | undefined
    public status: RandomnessStatus

    constructor(params: {
        timestamp: bigint
        value: bigint
        hashedValue: Hex
        commitmentTransactionIntentId?: UUID
        revealTransactionIntentId?: UUID
        status: RandomnessStatus
    }) {
        this.timestamp = params.timestamp
        this.value = params.value
        this.hashedValue = params.hashedValue
        this.commitmentTransactionIntentId = params.commitmentTransactionIntentId
        this.revealTransactionIntentId = params.revealTransactionIntentId
        this.status = params.status
    }

    public commitmentExecuted(): void {
        this.status = RandomnessStatus.COMMITMENT_EXECUTED
    }

    public revealExecuted(): void {
        this.status = RandomnessStatus.REVEAL_EXECUTED
    }

    public addCommitmentTransactionIntentId(intentId: UUID): void {
        this.commitmentTransactionIntentId = intentId
        this.status = RandomnessStatus.COMMITMENT_SUBMITTED
    }

    public addRevealTransactionIntentId(intentId: UUID): void {
        this.revealTransactionIntentId = intentId
        this.status = RandomnessStatus.REVEAL_SUBMITTED
    }

    public commitmentFailed(): void {
        this.status = RandomnessStatus.COMMITMENT_FAILED
    }

    public revealFailed(): void {
        this.status = RandomnessStatus.REVEAL_FAILED
    }

    public revealNotSubmittedOnTime(): void {
        this.status = RandomnessStatus.REVEAL_NOT_SUBMITTED_ON_TIME
    }

    static createRandomness(timestamp: bigint): Randomness {
        const value = Randomness.generateValue()
        const hashedValue = Randomness.hashValue(value)
        return new Randomness({
            timestamp,
            value,
            hashedValue,
            commitmentTransactionIntentId: undefined,
            revealTransactionIntentId: undefined,
            status: RandomnessStatus.PENDING,
        })
    }

    private static generateValue(): bigint {
        const bytes = crypto.randomBytes(32)
        let hex = "0x"

        for (const byte of bytes) {
            hex += byte.toString(16).padStart(2, "0")
        }

        return BigInt(hex)
    }

    private static hashValue(value: bigint): Hex {
        return keccak256(encodePacked(["uint256"], [value]))
    }
}
