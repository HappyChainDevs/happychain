import type { Account, Address, Hex } from "viem"
import { simulateSubmit } from "./simulateSubmit"

export async function estimateSubmitGas(account: Account, entryPoint: Address, encodedHappyTx: Hex) {
    const simulate = await simulateSubmit(account, entryPoint, encodedHappyTx)

    return {
        executeGasLimit: BigInt(simulate.result.executeGas),
        gasLimit: BigInt(simulate.result.gas),
        maxFeePerGas: 1200000000n,
        submitterFee: 100n,
    }
}
