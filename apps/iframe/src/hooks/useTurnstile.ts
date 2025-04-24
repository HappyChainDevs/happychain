import { useCallback, useEffect, useRef, useState } from "react"

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

export const useTurnstile = (sitekey: string) => {
    const [token, setToken] = useState("")
    const widgetRef = useRef<HTMLDivElement>(null)

    const renderCaptcha = useCallback(() => {
        if (widgetRef.current && window.turnstile && widgetRef.current.childElementCount === 0) {
            window.turnstile.render(widgetRef.current, {
                sitekey,
                callback: (token) => {
                    setToken(token)
                    if (widgetRef.current) {
                        widgetRef.current.innerHTML = ""
                    }
                },
            })
        }
    }, [sitekey])

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

    return { token, widgetRef, renderCaptcha }
} 