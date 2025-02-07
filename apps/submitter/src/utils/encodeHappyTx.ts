import type { EstimateGasInput } from "../tmp/interface/submitter_estimateGas"

export function encodeHappyTx(_tx: EstimateGasInput["tx"]): `0x${string}` {
    console.warn("TODO: encode HappyTX")
    return "0x"
}
