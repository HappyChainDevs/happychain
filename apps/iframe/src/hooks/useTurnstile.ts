import { promiseWithResolvers } from "@happy.tech/common"
import { type RefObject, useCallback, useEffect, useRef, useState } from "react"

// ref: https://github.com/marsidev/react-turnstile/blob/v1.1.0/packages/lib/src/turnstile.ts
declare global {
    interface Window {
        turnstile: {
            render: (
                container: HTMLElement | string | null,
                options: {
                    sitekey: string
                    callback?: (token: string) => void
                    "expired-callback"?: (token: string) => void
                    "error-callback"?: (error: string) => void
                    "unsupported-callback"?: () => void
                    retry?: "auto" | "never"
                },
            ) => void
            reset: (widget: HTMLElement | string | null) => void
            remove: (widget: HTMLElement | string | null) => void
        }
    }
}

export type UseTurnstileReturn<Lazy extends boolean> =
    | {
          loading: true
          token?: undefined
          render?: undefined
          remove?: undefined
          error?: undefined
      }
    | {
          loading: false
          token?: Lazy extends true ? () => Promise<string> : string
          error?: Lazy extends true ? undefined : unknown
          render: () => void
          remove: () => void
      }

export type UseTurnStyleArgs<Lazy extends boolean> = {
    lazy: Lazy
    widget: RefObject<HTMLElement | null>
    sitekey: string
}

/**
 * Use Cloudflare Turnstile to obtain a token that verifies the user is less likely to be a bot.
 *
 * This function works in two modes affecting the output type. In lazy mode, it only renders the captcha on demand,
 * and unrenders it after obtaining the token. The `token` field in the return struct is an async function that waits
 * for the captcha to be rendered then for the user to pass the challenge.
 *
 * In non-lazy mode, the hook returns functions to render or remove the captcha, as well as the last obtained token or
 * error value. This is for cases where we want to render the captcha as a permanent fixture.
 *
 * In both cases, the function takes an html element ID which is the container where Turnstile should render, and
 * also returns "loading" when the turnstile script is being loaded (all other returned fields will be undefined).
 */
export function useTurnstile<Lazy extends boolean>({
    lazy,
    widget,
    sitekey,
}: UseTurnStyleArgs<Lazy>): UseTurnstileReturn<Lazy> {
    // only use those in non-lazy mode
    const [token, setToken] = useState<string | undefined>(undefined)
    const [error, setError] = useState<string | undefined>(undefined)

    const [_, setLoading] = useState(true)
    const rendered = useRef(false)

    // Add script to the page if it doesn't exist.
    useEffect(() => {
        const SCRIPT_ID = "cf-turnstile-script" // picked by us
        const existing = document.getElementById(SCRIPT_ID)
        if (existing) {
            if (window.turnstile) setLoading(false)
        } else if (!existing) {
            const script = document.createElement("script")
            script.id = SCRIPT_ID
            script.async = true
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            script.onload = () => {
                setLoading(false)
            }
            document.body.appendChild(script)
        }
    }, [])

    const { promise, resolve, reject } = promiseWithResolvers<string>()
    const lastPromise = useRef<Promise<string>>(null)
    if (!lastPromise.current) lastPromise.current = promise

    const render = useCallback(() => {
        if (!window.turnstile) {
            reject("Turnstile script not loaded, couldn't render Turnstile widget")
            return
        } else if (!widget.current) {
            reject("Widget not mounted, can't render")
            return
        } else if (rendered.current) {
            if (!lastPromise.current) reject("Implementation error in useTurnstile")
            else lastPromise.current.then((token) => resolve(token)).catch((error) => reject(error))
            return
        }
        window.turnstile.render(widget.current, {
            sitekey,
            callback: (token) => {
                if (lazy) resolve(token)
                else setToken(token)
            },
            "expired-callback": () => {
                if (!window.turnstile || !rendered.current || !widget.current) return
                window.turnstile.reset(widget.current)
            },
            "error-callback": (error) => {
                if (!lazy) setError(error)
                else reject(error)
            },
            "unsupported-callback": () => {
                const error_ = "Unsupported browser"
                if (!lazy) setError(error_)
                else reject(error_)
            },
            // In lazy mode: on error, error-callback is called, only try again whenever `token()` is invoked
            // again (e.g. on a button press).
            retry: lazy ? "never" : "auto",
        })
        rendered.current = true
    }, [widget, sitekey, lazy, resolve, reject])

    const remove = useCallback(() => {
        if (!window.turnstile || !rendered.current || !widget.current) return
        window.turnstile.remove(widget.current)
        rendered.current = false
    }, [widget])

    if (!window.turnstile) return { loading: true }

    if (!lazy) return { loading: false, token, error, render, remove } as UseTurnstileReturn<Lazy>

    // biome-ignore format: compact
    return { loading: false, token: () => { render(); return promise.finally(remove) } } as UseTurnstileReturn<Lazy>
}
