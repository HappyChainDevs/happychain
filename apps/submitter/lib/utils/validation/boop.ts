import type { AssertCompatible } from "@happy.tech/common"
import { type } from "arktype"
import { type Boop, type BoopLog, type BoopReceipt, Onchain } from "#lib/types"
import { Address, Bytes, Hash, Int256, UInt32, UInt256 } from "./ark"

export const SBoop = type({
    "+": "reject",
    account: Address,
    dest: Address,
    payer: Address,
    value: UInt256.default("0"),
    nonceTrack: UInt256.configure({ example: "0" }),
    nonceValue: UInt256.configure({ example: "42" }),
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
    address: Address,
    topics: Bytes.array(),
    data: Bytes,
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

type _a1 = AssertCompatible<typeof SBoop.infer, Boop>
type _a2 = AssertCompatible<typeof SBoopLog.infer, BoopLog>
type _a3 = AssertCompatible<typeof SBoopReceipt.infer, BoopReceipt>
type _a4 = AssertCompatible<typeof SBoopReceipt.infer, BoopReceipt>
