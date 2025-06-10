import { cx } from "class-variance-authority"
import { useAtomValue } from "jotai"
import { useCallback, useRef, useState } from "react"
import { getBalanceQueryKey } from "wagmi/query"
import { Button } from "#src/components/primitives/button/Button"
import { FormField } from "#src/components/primitives/form-field/FormField"
import { useTurnstile } from "#src/hooks/useTurnstile"
import { userAtom } from "#src/state/user"
import { queryClient } from "#src/tanstack-query/config"
import { UserNotFoundWarning } from "../home/tabs/views/UserNotFoundWarning"

const TURNSTILE_SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY!
const FAUCET_ENDPOINT = import.meta.env.VITE_FAUCET_ENDPOINT!

type RequestStatus = "idle" | "loading" | "success" | "error"

const StatusMessage = ({ status, message }: { status: RequestStatus; message?: string }) => {
    if (status === "idle") return null
    return (
        <div
            className={cx("mt-2 rounded px-3 py-2 w-full break-words whitespace-normal text-xs animate-fadeIn", {
                "bg-success/50 text-success": status === "success",
                "bg-error/50 text-error": status === "error",
                "bg-neutral/50": status === "loading",
            })}
        >
            {message}
        </div>
    )
}

export const FaucetView = () => {
    const user = useAtomValue(userAtom)
    const [status, setStatus] = useState<RequestStatus>("idle")
    const [message, setMessage] = useState<string>()
    const turnstileRef = useRef<HTMLDivElement>(null)

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

                queryClient.invalidateQueries({
                    queryKey: getBalanceQueryKey({ address: user.address }),
                })
            } catch (err: unknown) {
                setStatus("error")
                setMessage(err instanceof Error ? err.message : "Network error")
            }
        },
        [getToken, user, turnstileLoading],
    )

    if (!user) return <UserNotFoundWarning />

    return (
        <div className="p-6 max-w-md mx-auto w-full overflow-hidden">
            <FormField.Root>
                <form onSubmit={handleSubmit} className="space-y-4 w-full flex flex-col items-center">
                    <Button
                        type="submit"
                        intent="primary"
                        isLoading={status === "loading"}
                        disabled={turnstileLoading || status === "loading"}
                    >
                        {status === "loading" ? "" : "Request Tokens"}
                    </Button>
                    <StatusMessage status={status} message={message} />
                    <div ref={turnstileRef} />
                </form>
            </FormField.Root>
        </div>
    )
}
