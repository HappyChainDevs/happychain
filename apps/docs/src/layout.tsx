import { HappyWalletProvider } from "@happy.tech/react"
import type { PropsWithChildren } from "react"

export default function Layout({ children }: PropsWithChildren) {
    return (
        <div>
            <HappyWalletProvider>{children}</HappyWalletProvider>
        </div>
    )
}
