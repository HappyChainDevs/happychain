import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import App from 'src/App'

import 'lib/index.css'

// biome-ignore lint/style/noNonNullAssertion: vite boilerplate
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
        <StrictMode>
            <App />
        </StrictMode>,
    )
}
