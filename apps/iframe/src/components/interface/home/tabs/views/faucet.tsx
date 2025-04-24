import { Field } from "@ark-ui/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { isAddress } from "viem"
import { Button } from "#src/components/primitives/button/Button"
import { FieldInput } from "#src/components/primitives/input/FieldInput"
import { Input } from "#src/components/primitives/input/Input"

declare global {
    interface Window {
        turnstile: {
            render: (
                container: HTMLElement | null,
                options: { sitekey: string; callback: (token: string) => void },
            ) => void
            reset: () => void
        }
    }
}

const TURNSTILE_SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY!
const FAUCET_ENDPOINT = import.meta.env.VITE_FAUCET_ENDPOINT!

const FaucetView = () => {
    const [address, setAddress] = useState("")
    const [token, setToken] = useState("")
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [message, setMessage] = useState("")
    const widgetRef = useRef<HTMLDivElement>(null)

    const renderCaptcha = useCallback(() => {
        if (widgetRef.current && window.turnstile && widgetRef.current.childElementCount === 0) {
            window.turnstile.render(widgetRef.current, {
                sitekey: TURNSTILE_SITEKEY,
                callback: (token) => {
                    setToken(token)
                    if (widgetRef.current) {
                        widgetRef.current.innerHTML = ""
                    }
                },
            })
        }
    }, [])

    useEffect(() => {
        const SCRIPT_ID = "cf-turnstile"
        const existing = document.getElementById(SCRIPT_ID)

        if (!existing) {
            const script = document.createElement("script")
            script.id = SCRIPT_ID
            script.async = true
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
            script.onload = renderCaptcha
            document.body.appendChild(script)
        } else if (window.turnstile) {
            renderCaptcha()
        }

        return () => {
            if (window.turnstile) {
                window.turnstile.reset()
            }
        }
    }, [renderCaptcha])

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault()
            if (!isAddress(address) || !token) return

            setStatus("loading")
            setMessage("Sending request...")

            try {
                const res = await fetch(FAUCET_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ address, cfToken: token }),
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
            } finally {
                setToken("")
                renderCaptcha()
            }
        },
        [address, token, renderCaptcha],
    )

    const disabled = !isAddress(address) || !token || status === "loading"

    const isEmpty = address === ""
    const isValidAddress = isAddress(address)
    const isInvalid = !isEmpty && !isValidAddress

    return (
        <div className="p-4 max-w-md mx-auto w-full overflow-hidden">
            <h1 className="text-xl font-semibold mb-4">Faucet</h1>
            <form onSubmit={handleSubmit} className="space-y-4 w-full">
                <FieldInput
                    invalid={isInvalid}
                    errorLabel="Please enter a valid Ethereum address"
                    helperLabel="Enter the address to receive tokens"
                >
                    <Field.Label className="text-md text-base-content">Address</Field.Label>
                    <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value.trim())}
                        placeholder="0x123..."
                        autoComplete="off"
                        required
                        inputClass="w-full"
                        scale="default"
                    />
                </FieldInput>
                <div ref={widgetRef} />
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
                <Button type="submit" disabled={disabled}>
                    {status === "loading" ? "Sending..." : "Submit"}
                </Button>
            </form>
        </div>
    )
}

export default FaucetView
