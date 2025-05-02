import { useAtomValue } from "jotai"
import { useCallback, useRef, useState } from "react"
import { Button } from "#src/components/primitives/button/Button"
import { useTurnstile } from "#src/hooks/useTurnstile"
import { userAtom } from "#src/state/user"
import UserNotFoundWarning from "./UserNotFoundWarning"

const TURNSTILE_SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY!
const FAUCET_ENDPOINT = import.meta.env.VITE_FAUCET_ENDPOINT!

const FaucetView = () => {
    const user = useAtomValue(userAtom)
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [message, setMessage] = useState("")
    const turnstileRef = useRef<HTMLDivElement | null>(null)

    const { loading: turnstileLoading, token: getToken } = useTurnstile({
        lazy: true,
        widget: turnstileRef,
        sitekey: TURNSTILE_SITEKEY,
    })

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault()
            if (turnstileLoading || !user || !getToken) return
            try {
                setStatus("loading")
                setMessage("Sending request...")
                const cfToken = await getToken()
                const res = await fetch(FAUCET_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ address: user.address, cfToken }),
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data?.message || "Unknown error")
                setStatus("success")
                setMessage(data?.message || "Tokens sent!")
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setStatus("error")
                    setMessage(err.message)
                } else {
                    setStatus("error")
                    setMessage("Network error")
                }
            }
        },
        [getToken, user, turnstileLoading],
    )

    if (!user) return <UserNotFoundWarning />

    return (
        <div className="p-4 max-w-md mx-auto w-full overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-4 w-full flex flex-col items-center">
                <Button type="submit" disabled={turnstileLoading || status === "loading"}>
                    {status === "loading" ? "Sending..." : "Request Tokens"}
                </Button>
                {status !== "idle" && (
                    <p
                        className={`mt-2 rounded px-2 py-1 w-full break-words whitespace-normal overflow-hidden text-xs ${
                            status === "success"
                                ? "bg-green-100 text-green-800"
                                : status === "error"
                                  ? "bg-red-100 text-red-800"
                                  : ""
                        }`}
                    >
                        {message}
                    </p>
                )}
                {/* Turnstile will render here. */}
                <div ref={turnstileRef} />
            </form>
        </div>
    )
}

export default FaucetView
