import React from "react"
import ReactDOM from "react-dom/client"

import { HappyWalletProvider } from "@happychain/react"

import App from "./App.tsx"

import "./index.css"

// biome-ignore lint/style/noNonNullAssertion: vite boilerplate
ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <HappyWalletProvider init={{ chain: "testnet" }}>
            <App />
        </HappyWalletProvider>
    </React.StrictMode>,
)
