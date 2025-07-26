import { RouterProvider, createRouter } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { HappyAccountProvider } from "./providers/HappyAccountProvider"
import { routeTree } from "./routeTree.gen"
import "./listeners"
import "./index.css"
import type { Logger } from "@happy.tech/common"
import { QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { HealthCheckService } from "#src/services/HealthCheckService"
import { queryClient } from "./tanstack-query/config"
import { logger } from "./utils/logger"
import { config } from "./wagmi/config"

HealthCheckService.start()

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router
    }
}

declare global {
    interface Window {
        happyLogger: Logger
    }
}

const rootElement = document.getElementById("root")
if (rootElement && !rootElement.innerHTML) {
    if (typeof window !== "undefined") {
        window.happyLogger = logger
    }
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
