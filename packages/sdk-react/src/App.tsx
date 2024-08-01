import { useEffect } from 'react'

import { HappyWallet, useHappyChain } from '../lib/index'

function App() {
    const { user, provider } = useHappyChain()

    useEffect(() => {
        provider.on('connect', () => {
            console.log('provider is connected')
        })

        provider.on('disconnect', () => {
            console.log('provider is disconnected')
        })

        return () => {
            // yolo
            provider.removeAllListeners()
        }
    }, [provider])
    return (
        <>
            <h1>Test App</h1>

            <div>
                USER:
                <pre>{JSON.stringify(user, null, 2)}</pre>
            </div>

            <div>
                WALLET:
                <HappyWallet />
            </div>
        </>
    )
}

export default App
