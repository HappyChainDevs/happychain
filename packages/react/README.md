# React SDK

React utilities for interacting with the Happy Wallet. 

For full documentation, visit https://docs.happy.tech/sdk/react

For an example of the @happy.tech/react library in action visit the demo: https://github.com/HappyChainDevs/happychain/tree/master/demos/react

## Install

```sh
npm i @happy.tech/react
```

## Wallet Provider

Use the HappyWalletProvider component to inject the wallet into the page

```tsx
import { HappyWalletProvider } from '@happy.tech/react'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <HappyWalletProvider>
            <App />
        </HappyWalletProvider>
    </React.StrictMode>,
)
```


## Connect Button

Let Users connect easily using the built in ConnectButton component.

```tsx
import { ConnectButton } from '@happy.tech/react'

function App() {
    return (
        <main>
            <ConnectButton />
        </main>
    )
}
```

## useHappyWallet hook

```tsx
import { useHappyWallet } from '@happy.tech/react'

function App() {
    const { provider, user } = useHappyWallet()

    // viem
    const publicClient = useMemo(() => createPublicClient({ transport: custom(provider) }), [provider])
    const walletClient = useMemo(
        () => user?.address && createWalletClient({ account: user.address, transport: custom(provider) }),
        [provider, user?.address],
    )

    // ethers v5
    const ethersV5Provider = useMemo(() => new ethers.providers.Web3Provider(provider), [provider])

    // ethers v6
    const ethersV6Provider = useMemo(() => new BrowserProvider(provider), [provider])

    return <main>{/* ... */}</main>
}
```
