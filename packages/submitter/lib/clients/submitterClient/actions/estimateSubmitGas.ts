import { AccountNotFoundError } from "../errors"
import { simulateSubmit } from "./simulateSubmit"

export async function estimateSubmitGas(request: Parameters<typeof simulateSubmit>[0]) {
    if (!request.account) throw new AccountNotFoundError("estimateSubmitGas")
    const simulate = await simulateSubmit(request)

    return {
        executeGasLimit: BigInt(simulate.result.executeGas),
        gasLimit: BigInt(simulate.result.gas),
        maxFeePerGas: 1200000000n,
        submitterFee: 100n,
    }
}
