import { toFunctionSelector } from "viem"

// Calculate interface ID by XORing function selectors
function calculateInterfaceId(functionSignatures: string[]): string {
    let interfaceId = 0n

    for (const signature of functionSignatures) {
        // Take first 4 bytes of keccak256
        const selector = BigInt(toFunctionSelector(signature))
        interfaceId ^= selector
    }

    return "0x" + interfaceId.toString(16).padStart(8, "0")
}

// HappyTx struct tuple type for function signatures
const happyTxType =
    "tuple(address account,uint32 gasLimit,uint32 executeGasLimit,address dest,address paymaster,uint256 value,uint192 nonceTrack,uint64 nonceValue,uint256 maxFeePerGas,int256 submitterFee,bytes callData,bytes paymasterData,bytes validatorData)"

// IHappyAccount interface functions
const iHappyAccountFunctions = [
    `validate(${happyTxType})`,
    `execute(${happyTxType})`,
    "isValidSignature(bytes32,bytes)",
    "supportsInterface(bytes4)",
]

// IHappyPaymaster interface functions
const iHappyPaymasterFunctions = [`payout(${happyTxType})`]

console.log("IHappyAccount interface ID:", calculateInterfaceId(iHappyAccountFunctions))
console.log("IHappyPaymaster interface ID:", calculateInterfaceId(iHappyPaymasterFunctions))

// IHappyAccount interface ID: 0x90ab9eae
// IHappyPaymaster interface ID: 0xa79b0c0c
