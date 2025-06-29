import { HappyWalletProvider } from "@happy.tech/react"
import posthog from "posthog-js"
import { PostHogProvider } from "posthog-js/react"
import type { PropsWithChildren } from "react"

if (typeof window !== "undefined") {
    const posthogKey = import.meta.env.HAPPY_POSTHOG_PUB_KEY
    const posthogHost = import.meta.env.HAPPY_POSTHOG_HOST
    if (posthogKey && posthogHost) posthog.init(posthogKey, { api_host: posthogHost, autocapture: true })
}

export default function Layout({ children }: PropsWithChildren) {
    return (
        <PostHogProvider client={posthog}>
            <HappyWalletProvider>{children}</HappyWalletProvider>
        </PostHogProvider>
    )
}
