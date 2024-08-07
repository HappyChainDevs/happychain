import { PrivyProvider } from "@happychain/privy-strategy"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { HappyAccountProvider } from "./providers/HappyAccountProvider"
import { routeTree } from "./routeTree.gen"

import "./listeners"

import "./index.css"

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router
    }
}

const rootElement = document.getElementById("root")
if (rootElement && !rootElement.innerHTML) {
    ReactDOM.createRoot(rootElement).render(
        <StrictMode>
            <PrivyProvider
                appId={import.meta.env.VITE_PRIVY_APP_ID}
                config={{ embeddedWallets: { createOnLogin: "users-without-wallets" } }}
            >
                <HappyAccountProvider>
                    <RouterProvider router={router} />
                </HappyAccountProvider>
            </PrivyProvider>
        </StrictMode>,
    )
}
