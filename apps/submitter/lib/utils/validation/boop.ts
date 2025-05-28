import type { AssertCompatible } from "@happy.tech/common"
import { type } from "arktype"
import { type Boop, type BoopLog, type BoopReceipt, Onchain } from "#lib/types"
import {
    Address,
    AddressValidation,
    Bytes,
    BytesValidation,
    Hash,
    HashValidation,
    Int256,
    Int256Validation,
    UInt32,
    UInt32Validation,
    UInt256,
    UInt256Validation,
} from "./ark"

// =====================================================================================================================
// VALIDATION-ONLY TYPES (for OpenAPI specs)

/**
 * Validation-only version of SBoop for OpenAPI
 */
export const SBoopValidation = type({
    account: AddressValidation,
    dest: AddressValidation,
    payer: AddressValidation,
    value: UInt256Validation.default("0n"),
    nonceTrack: UInt256Validation.configure({ example: "0n" }),
    nonceValue: UInt256Validation.configure({ example: "42n" }),
    maxFeePerGas: UInt256Validation.default("0n"),
    submitterFee: Int256Validation.default("0n"),
    gasLimit: UInt32Validation.default(0),
    validateGasLimit: UInt32Validation.default(0),
    validatePaymentGasLimit: UInt32Validation.default(0),
    executeGasLimit: UInt32Validation.default(0),
    callData: BytesValidation.default("0x"),
    validatorData: BytesValidation.default("0x"),
    extraData: BytesValidation.default("0x"),
})

/**
 * Validation-only version of SBoopLog for OpenAPI
 */
export const SBoopLogValidation = type({
    address: AddressValidation,
    topics: BytesValidation.array().configure({ example: ["0x1beb36f4"] }),
    data: BytesValidation,
})

/**
 * Validation-only version of SBoopReceipt for OpenAPI
 */
export const SBoopReceiptValidation = type({
    boopHash: HashValidation,
    boop: SBoopValidation,
    status: type("string").configure({ example: Onchain.Success }),
    description: type("string").configure({ example: "Boop executed successfully." }),
    entryPoint: AddressValidation,
    logs: SBoopLogValidation.array(),
    revertData: BytesValidation,
    evmTxHash: HashValidation,
    blockHash: HashValidation,
    blockNumber: UInt256Validation,
    gasPrice: UInt256Validation,
})

// =====================================================================================================================
// TYPES WITH TRANSFORMATIONS (for input validation)

/**
 * SBoop validator with transformations
 */
export const SBoop = type({
    "+": "reject",
    account: Address,
    dest: Address,
    payer: Address,
    value: UInt256.default("0n"),
    nonceTrack: UInt256.configure({ example: "0n" }),
    nonceValue: UInt256.configure({ example: "42n" }),
    maxFeePerGas: UInt256.default("0n"),
    submitterFee: Int256.default("0n"),
    gasLimit: UInt32.default(0),
    validateGasLimit: UInt32.default(0),
    validatePaymentGasLimit: UInt32.default(0),
    executeGasLimit: UInt32.default(0),
    callData: Bytes.default("0x"),
    validatorData: Bytes.default("0x"),
    extraData: Bytes.default("0x"),
})

export const SBoopLog = type({
    address: AddressValidation,
    topics: BytesValidation.array().configure({ example: ["0x1beb36f4"] }),
    data: BytesValidation,
})

export const SBoopReceipt = type({
    boopHash: HashValidation,
    boop: SBoop,
    status: type.valueOf(Onchain).configure({ example: Onchain.Success }),
    description: type("string").configure({ example: "Boop executed successfully." }),
    entryPoint: Address,
    logs: SBoopLog.array(),
    revertData: Bytes,
    evmTxHash: Hash,
    blockHash: Hash,
    blockNumber: UInt256,
    gasPrice: UInt256,
})

type _a1 = AssertCompatible<typeof SBoop.infer, Boop>
type _a2 = AssertCompatible<typeof SBoopLog.infer, BoopLog>
type _a3 = AssertCompatible<typeof SBoopReceipt.infer, BoopReceipt>
