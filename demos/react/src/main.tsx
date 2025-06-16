import { happyProvider } from "@happy.tech/core"
import { HappyWalletProvider } from "@happy.tech/react"
import React from "react"
import ReactDOM from "react-dom/client"
import { Toaster } from "sonner"
import App from "./App.tsx"

/**
 * Console demo. to prompt for connection, or login, in the console try typing
 * await window.happyProvider.request({ method: 'eth_requestAccounts' })
 * or
 * await window.happyProvider.request({ method: 'wallet_requestPermissions', params: [{eth_accounts: {}}] })
 *
 * to disconnect
 * await window.happyProvider.request({ method: 'wallet_revokePermissions', params: [{eth_accounts: {}}] })
 */
// biome-ignore lint/suspicious/noExplicitAny: demo purposes only. not needed under regular usage
;(window as any).happyProvider = happyProvider

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <HappyWalletProvider init={{ chainId: import.meta.env.VITE_CHAIN_ID, disableStyles: true }}>
            <Toaster theme="system" richColors={true} closeButton={true} />
            <App />
        </HappyWalletProvider>
    </React.StrictMode>,
)
