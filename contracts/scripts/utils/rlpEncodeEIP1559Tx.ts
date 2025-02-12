import { toRlp, type Hex } from "viem";

// type AccessListEntry = [address: Hex, storageKeys: Hex[]];

const dummyEIP1559Tx = {
    chainId: "0xaa36a7",
    nonce: "0x7bd9",
    maxPriorityFeePerGas: "0x14431ea",
    maxFeePerGas: "0x2a4262836",
    gas: "0x21a26",
    to: "0x69c7943da0d7e45d44bd0ce7a2412dcdae423788",
    value: "0xE8D4A51000",
    data: "0x00", // input field is called data in RLP encoding
    accessList: [] as Hex[],
    v: "0x0",
    r: "0xbbd212c28057d067d4043bfb13c5d11af7671275e9b8477a0199ae06d3e9555e",
    s: "0x50e75e0aec641b4e4c47900518b764be3e7dcd1a820cb170690b8a49b59bc94b"
};

// Convert transaction fields to RLP format
const rlpFields: [Hex, ...Hex[]] = [
    "0x02", // Type 2 (EIP-1559)
    dummyEIP1559Tx.chainId as Hex,
    dummyEIP1559Tx.nonce as Hex,
    dummyEIP1559Tx.maxPriorityFeePerGas as Hex,
    dummyEIP1559Tx.maxFeePerGas as Hex,
    dummyEIP1559Tx.gas as Hex,
    dummyEIP1559Tx.to as Hex,
    dummyEIP1559Tx.value as Hex,
    dummyEIP1559Tx.data as Hex,
    ...dummyEIP1559Tx.accessList,
    dummyEIP1559Tx.v as Hex,
    dummyEIP1559Tx.r as Hex,
    dummyEIP1559Tx.s as Hex
];

// Encode the transaction
const rlpEncoded = toRlp(rlpFields);
console.log('RLP Encoded EIP-1559 Transaction:', rlpEncoded);
// 0xf8760283aa36a7827bd984014431ea8502a426283683021a269469c7943da0d7e45d44bd0ce7a2412dcdae42378885e8d4a510000000a0bbd212c28057d067d4043bfb13c5d11af7671275e9b8477a0199ae06d3e9555ea050e75e0aec641b4e4c47900518b764be3e7dcd1a820cb170690b8a49b59bc94b

const alternateTx = {
    "type": "0x2",
    "chainId": "0xaa36a7",
    "nonce": "0x7bd9",
    "gas": "0x21a26",
    "maxFeePerGas": "0x2a4262836",
    "maxPriorityFeePerGas": "0x14431ea",
    "to": "0x69c7943da0d7e45d44bd0ce7a2412dcdae423788",
    "value": "0xE8D4A51000",
    "accessList": [],
    "data": "0x00",
    "r": "0xbbd212c28057d067d4043bfb13c5d11af7671275e9b8477a0199ae06d3e9555e",
    "s": "0x50e75e0aec641b4e4c47900518b764be3e7dcd1a820cb170690b8a49b59bc94b",
    "yParity": "0x0",
    "v": "0x0",
    "hash": "0xa7a5c1a7d57cc9fb017933345d4c276fea83bfd792ca86b31f4141248d6bb3dc",
    "blockHash": "0x909fe2ebdc82a2170d809cf84ed564461cf919a324ad36542e80da5686a5eedc",
    "blockNumber": "0x755c6d",
    "transactionIndex": "0x91",
    "from": "0x52792d081461e5c874e78f90360e3320b2960cc5",
    "gasPrice": "0x140e889ca"
}

const rlpFieldsAlternate: [Hex, ...Hex[]] = [
    "0x02", // Type 2 (EIP-1559)
    alternateTx.chainId as Hex,
    alternateTx.nonce as Hex,
    alternateTx.maxPriorityFeePerGas as Hex,
    alternateTx.maxFeePerGas as Hex,
    alternateTx.gas as Hex,
    alternateTx.to as Hex,
    alternateTx.value as Hex,
    alternateTx.data as Hex,
    ...alternateTx.accessList,
    alternateTx.v as Hex,
    alternateTx.r as Hex,
    alternateTx.s as Hex
];

// Encode the alternate transaction
const rlpEncodedAlternate = toRlp(rlpFieldsAlternate);
console.log('RLP Encoded Alternate EIP-1559 Transaction:', rlpEncodedAlternate);
// 0xf8760283aa36a7827bd984014431ea8502a426283683021a269469c7943da0d7e45d44bd0ce7a2412dcdae42378885e8d4a510000000a0bbd212c28057d067d4043bfb13c5d11af7671275e9b8477a0199ae06d3e9555ea050e75e0aec641b4e4c47900518b764be3e7dcd1a820cb170690b8a49b59bc94b