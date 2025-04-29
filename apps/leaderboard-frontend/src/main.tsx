import React from "react"
import ReactDOM from "react-dom/client"

import { happyChainSepolia, happyProvider } from "@happy.tech/core"
import { HappyWalletProvider } from "@happy.tech/react"

import App from "./App.tsx"

// biome-ignore lint/suspicious/noExplicitAny: demo purposes only. not needed under regular usage
;(window as any).happyProvider = happyProvider

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <HappyWalletProvider init={{ chainId: happyChainSepolia.id }}>
            <App />
        </HappyWalletProvider>
    </React.StrictMode>,
)
