import { StrictMode } from "react"
import ReactDOM from "react-dom/client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { WagmiProvider } from "wagmi"

import { HappyAccountProvider } from "./providers/HappyAccountProvider"
// Import the generated route tree
import { routeTree } from "./routeTree.gen"

import "./listeners"

import "./index.css"
import { config } from "./wagmi/config"

// Create a new router instance
const router = createRouter({ routeTree })

const queryClient = new QueryClient()

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
            <WagmiProvider config={config}>
                <QueryClientProvider client={queryClient}>
                    <HappyAccountProvider>
                        <RouterProvider router={router} />
                    </HappyAccountProvider>
                </QueryClientProvider>
            </WagmiProvider>
        </StrictMode>,
    )
}
