import type { AssertCompatible, BigIntSerialized } from "@happy.tech/common"
import { type } from "arktype"
import { type Boop, type BoopLog, type BoopReceipt, Onchain } from "#lib/types"
import {
    Address,
    AddressIn,
    Bytes,
    BytesIn,
    Hash,
    HashIn,
    Int256,
    Int256In,
    UInt32,
    UInt32In,
    UInt256,
    UInt256In,
} from "./ark"

// =====================================================================================================================
// TYPES WITH TRANSFORMATIONS (for input validation)

export const SBoopIn = type({
    account: AddressIn,
    dest: AddressIn,
    payer: AddressIn,
    value: UInt256In.default("0"),
    nonceTrack: UInt256In,
    nonceValue: UInt256In,
    maxFeePerGas: UInt256In.default("0"),
    submitterFee: Int256In.default("0"),
    gasLimit: UInt32In.default(0),
    validateGasLimit: UInt32In.default(0),
    validatePaymentGasLimit: UInt32In.default(0),
    executeGasLimit: UInt32In.default(0),
    callData: BytesIn.default("0x"),
    validatorData: BytesIn.default("0x"),
    extraData: BytesIn.default("0x"),
})

export const SBoop = type({
    "+": "reject",
    account: Address,
    dest: Address,
    payer: Address,
    value: UInt256.default("0"),
    nonceTrack: UInt256,
    nonceValue: UInt256,
    maxFeePerGas: UInt256.default("0"),
    submitterFee: Int256.default("0"),
    gasLimit: UInt32.default(0),
    validateGasLimit: UInt32.default(0),
    validatePaymentGasLimit: UInt32.default(0),
    executeGasLimit: UInt32.default(0),
    callData: Bytes.default("0x"),
    validatorData: Bytes.default("0x"),
    extraData: Bytes.default("0x"),
})

export const SBoopLog = type({
    address: AddressIn,
    topics: BytesIn.array(),
    data: BytesIn,
})

export const SBoopReceipt = type({
    boopHash: Hash,
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

// Input validation version with transformations
export const SBoopReceiptIn = type({
    boopHash: HashIn,
    boop: SBoopIn,
    status: type.valueOf(Onchain).configure({ example: Onchain.Success }),
    description: type("string").configure({ example: "Boop executed successfully." }),
    entryPoint: AddressIn,
    logs: SBoopLog.array(),
    revertData: BytesIn,
    evmTxHash: HashIn,
    blockHash: HashIn,
    blockNumber: UInt256In,
    gasPrice: UInt256In,
})

type _a1 = AssertCompatible<typeof SBoopIn.infer, Boop>
type _a2 = AssertCompatible<typeof SBoopLog.infer, BigIntSerialized<BoopLog>>
type _a3 = AssertCompatible<typeof SBoopReceipt.infer, BigIntSerialized<BoopReceipt>>
type _a4 = AssertCompatible<typeof SBoopReceiptIn.infer, BoopReceipt>
