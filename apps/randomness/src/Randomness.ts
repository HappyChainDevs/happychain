import crypto from "node:crypto"
import type { Hex, UUID } from "@happy.tech/common"
import { bytesToHex, encodePacked, keccak256 } from "viem"

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
