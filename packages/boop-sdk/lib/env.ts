const { SUBMITTER_URL, RPC_URL, ENTRYPOINT } = import.meta.env

const missed = new Set<string>()
if (!SUBMITTER_URL) missed.add("SUBMITTER_URL")
if (!RPC_URL) missed.add("RPC_URL")
if (!ENTRYPOINT) missed.add("ENTRYPOINT")
if (missed.size > 0) throw new Error(`Missing environment variables: ${Array.from(missed).join(", ")}`)

type HttpUrl = `http://${string}` | `https://${string}`

export const env = { SUBMITTER_URL, RPC_URL, ENTRYPOINT } as {
    SUBMITTER_URL: HttpUrl
    RPC_URL: HttpUrl
    ENTRYPOINT: `0x${string}`
}
