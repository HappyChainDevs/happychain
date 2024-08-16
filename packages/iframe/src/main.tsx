import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import { createRouter, RouterProvider } from '@tanstack/react-router'

import { HappyAccountProvider } from './providers/HappyAccountProvider'
// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './index.css'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

const rootElement = document.getElementById('root')
if (rootElement && !rootElement.innerHTML) {
    ReactDOM.createRoot(rootElement).render(
        <StrictMode>
            <HappyAccountProvider>
                <RouterProvider router={router} />
            </HappyAccountProvider>
        </StrictMode>,
    )
}
