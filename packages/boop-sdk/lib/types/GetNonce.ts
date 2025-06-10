export type GetNonceInput = {
    /** Happy Account Address */
    address: `0x${string}`
    /** Nonce Track */
    nonceTrack: bigint
}

export const GetNonce = {
    Success: "getNonceSuccess",
    Error: "getNonceError",
} as const

export type GetNonceStatus = (typeof GetNonce)[keyof typeof GetNonce]

export type GetNonceOutput = GetNonceSuccess | GetNonceError

export type GetNonceSuccess = GetNonceInput & {
    status: typeof GetNonce.Success
    nonceValue: bigint
}

export type GetNonceError = GetNonceInput & {
    status: typeof GetNonce.Error
    error: string
}
