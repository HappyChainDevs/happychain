import { stringify } from "@happy.tech/common"

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
    description: string
}

// "nonceValues(address,uint192)(uint64)"
const nonceValuesSelector = "0xe631c8f2"

export async function getNonce(baseUrl: string, to: `0x${string}`, input: GetNonceInput): Promise<GetNonceOutput> {
    try {
        const addressData = input.address.replace(/^0x/, "").toLowerCase().padStart(64, "0")
        const nonceTrackData = input.nonceTrack.toString(16).padStart(64, "0")
        const nonceValue = await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: 0,
                jsonrpc: "2.0",
                method: "eth_call",
                params: [
                    {
                        to: to,
                        input: `${nonceValuesSelector}${addressData}${nonceTrackData}`,
                    },
                ],
            }),
        })
            .then((res) => res.json())
            .then((response) => BigInt(response.result))

        return { ...input, nonceValue, status: GetNonce.Success }
    } catch (error) {
        return { ...input, status: GetNonce.Error, description: stringify(error) }
    }
}
