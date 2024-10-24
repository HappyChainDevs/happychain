import { HappyWalletProvider } from "@happychain/react"
import React from "react"
import ReactDOM from "react-dom/client"
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

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <HappyWalletProvider>
            <App />
        </HappyWalletProvider>
    </React.StrictMode>,
)
