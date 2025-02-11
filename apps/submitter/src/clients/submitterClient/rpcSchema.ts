import type { Address, Hex } from "viem"

// TODO: does this make sense here?
// no not really. its only used if we call client.request({ method: }) directly,
// however we have the client.simulate helpers...
// on client side though though... yes maybe?
export type CustomRpcSchema = [
    {
        Method: "submitter_estimateGas"
        Parameters: [{ entryPoint?: Address; tx: Hex }]
        ReturnType: string // TODO: return type is wrong here
    },
    {
        Method: "submitter_execute"
        Parameters: [{ entryPoint?: Address; tx: Hex }]
        ReturnType: string // TODO: return type is wrong here
    },
]
