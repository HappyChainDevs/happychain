import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import { createRouter, RouterProvider } from '@tanstack/react-router'

import { HappyAccountProvider } from 'src/providers/HappyAccountProvider'
// Import the generated route tree
import { routeTree } from 'src/routeTree.gen'

import 'src/index.css'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

// biome-ignore lint/style/noNonNullAssertion: vite boilerplate
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
        <StrictMode>
            <HappyAccountProvider>
                <RouterProvider router={router} />
            </HappyAccountProvider>
        </StrictMode>,
    )
}
