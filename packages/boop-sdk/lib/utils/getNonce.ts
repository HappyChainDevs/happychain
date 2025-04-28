export type GetNonceInput = {
    address: `0x${string}`
    nonceTrack: bigint
}

type GetNonceSuccess = GetNonceInput & {
    status: "success"
    nonceValue: bigint
}

type GetNonceFailure = GetNonceInput & {
    status: "error"
    description: string
}

export type GetNonceOutput = GetNonceSuccess | GetNonceFailure

// "nonceValues(address,uint192)(uint64)"
const nonceValuesSelector = "0xe631c8f2000000000000000000000000"

export async function getNonce(baseUrl: string, to: `0x${string}`, input: GetNonceInput): Promise<GetNonceOutput> {
    try {
        const addressData = input.address.replace(/^0x/, "").toLowerCase()
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

        return { ...input, nonceValue, status: "success" }
    } catch (error) {
        return { ...input, status: "error", description: (error as Error)?.message }
    }
}
