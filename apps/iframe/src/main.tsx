import { StrictMode } from "react"
import ReactDOM from "react-dom/client"

import { RouterProvider, createRouter } from "@tanstack/react-router"

import { HappyAccountProvider } from "./providers/HappyAccountProvider"
// Import the generated route tree
import { routeTree } from "./routeTree.gen"

import "./listeners"

import "./index.css"
import { QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { queryClient } from "./tanstack-query/config"
import { config } from "./wagmi/config"

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
            <HappyAccountProvider>
                <WagmiProvider config={config}>
                    <QueryClientProvider client={queryClient}>
                        <RouterProvider router={router} />
                    </QueryClientProvider>
                </WagmiProvider>
            </HappyAccountProvider>
        </StrictMode>,
    )
}
