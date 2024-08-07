import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App.tsx'

import './index.css'
import '@happychain/react/index.css'

// biome-ignore lint/style/noNonNullAssertion: vite boilerplate
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
