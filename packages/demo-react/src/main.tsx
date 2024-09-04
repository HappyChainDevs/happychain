import React from "react"
import ReactDOM from "react-dom/client"

import { HappyWalletProvider, happyProvider } from "@happychain/react"

import App from "./App.tsx"

import "./index.css"

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

// biome-ignore lint/style/noNonNullAssertion: vite boilerplate
ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <HappyWalletProvider init={{ chain: "testnet" }}>
            <App />
        </HappyWalletProvider>
    </React.StrictMode>,
)
