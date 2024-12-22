import {
    type AccessList,
    type Hex,
    type Signature,
    type TransactionSerializableEIP1559,
    type TransactionSerializableGeneric,
    assertTransactionEIP1559,
    concatHex,
    maxUint64,
    maxUint256,
    serializeAccessList,
    toHex,
    toRlp,
    trim,
} from "viem"

// Create a dummy EIP1559 transaction with maximum values for all fields
const MAX_BYTES32 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

const emptyAccessList: AccessList = []

const dummyTransaction: TransactionSerializableEIP1559 = {
    chainId: 111555111,
    nonce: 9007199254740991,
    maxPriorityFeePerGas: maxUint256,
    maxFeePerGas: maxUint256,
    gas: maxUint64,
    to: "0xDF55Fd47814C47375FA731dABFF5C0aB54820a61",
    value: maxUint256,
    data: "0x",
    accessList: emptyAccessList,
}

// Dummy signature with maximum values
const dummySignature: Signature = {
    r: MAX_BYTES32,
    s: MAX_BYTES32,
    v: 1n,
}

export function toYParitySignatureArray(
    transaction: TransactionSerializableGeneric,
    signature_?: Signature | undefined,
) {
    const signature = signature_ ?? transaction
    const { v, yParity } = signature

    if (typeof signature.r === "undefined") return []
    if (typeof signature.s === "undefined") return []
    if (typeof v === "undefined" && typeof yParity === "undefined") return []

    const r = trim(signature.r)
    const s = trim(signature.s)

    const yParity_ = (() => {
        if (typeof yParity === "number") return yParity ? toHex(1) : "0x"
        if (v === 0n) return "0x"
        if (v === 1n) return toHex(1)

        return v === 27n ? "0x" : toHex(1)
    })()

    return [yParity_, r === "0x00" ? "0x" : r, s === "0x00" ? "0x" : s]
}

// Main serialization function
function serializeTransactionEIP1559(
    transaction: TransactionSerializableEIP1559,
    signature?: Signature | undefined,
): Hex {
    const { chainId, gas, nonce, to, value, maxFeePerGas, maxPriorityFeePerGas, accessList, data } = transaction

    assertTransactionEIP1559(transaction)

    const serializedAccessList = serializeAccessList(accessList)

    const serializedTransaction = [
        toHex(chainId),
        nonce ? toHex(nonce) : "0x",
        maxPriorityFeePerGas ? toHex(maxPriorityFeePerGas) : "0x",
        maxFeePerGas ? toHex(maxFeePerGas) : "0x",
        gas ? toHex(gas) : "0x",
        to ?? "0x",
        value ? toHex(value) : "0x",
        data ?? "0x",
        ...serializedAccessList,
        ...toYParitySignatureArray(transaction, signature),
    ]

    // @ts-ignore This works fine
    return concatHex(["0x02", toRlp(serializedTransaction)])
}

// Serialize the transaction and calculate its size
const serializedTx = serializeTransactionEIP1559(dummyTransaction, dummySignature)
const txSize = (serializedTx.length - 2) / 2 // subtract 2 for '0x' prefix and divide by 2 since each byte is 2 hex chars

console.log(`Maximum EIP1559 transaction size: ${txSize} bytes`)
console.log(`Serialized transaction: ${serializedTx}`)

// Maximum EIP1559 transaction size: 213 bytes
// Serialized transaction: 0x02f8d28406a63227871fffffffffffffa0ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa0ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff88ffffffffffffffff94df55fd47814c47375fa731dabff5c0ab54820a61a0ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8001a0ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa0ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
