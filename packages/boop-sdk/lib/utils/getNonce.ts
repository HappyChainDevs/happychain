import { stringify } from "@happy.tech/common"
import { GetNonce, type GetNonceInput, type GetNonceOutput } from "../types/GetNonce"

// "nonceValues(address,uint192)(uint64)"
const nonceValuesSelector = "0xe631c8f2"

export async function getNonce(rpcUrl: string, to: `0x${string}`, input: GetNonceInput): Promise<GetNonceOutput> {
    try {
        const addressData = input.address.replace(/^0x/, "").toLowerCase().padStart(64, "0")
        const nonceTrackData = input.nonceTrack.toString(16).padStart(64, "0")
        const nonceValue = await fetch(rpcUrl, {
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
        return { ...input, status: GetNonce.Error, error: stringify(error) }
    }
}
