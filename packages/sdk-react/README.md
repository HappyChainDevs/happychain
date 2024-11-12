# React SDK

## Install

```sh
npm i @happychain/react
```

## Wallet Provider

Use the HappyWalletProvider component to inject the wallet into the page

```tsx
import { HappyWalletProvider } from '@happychain/react'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <HappyWalletProvider>
            <App />
        </HappyWalletProvider>
    </React.StrictMode>,
)
```

## useHappyChain hook

```tsx
import { useHappyChain } from '@happychain/react'

function App() {
    const { provider, user } = useHappyChain()

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

## EIP1193Provider

The raw eip1193provider is exposed directly, so you can initialize any compatible web3 library of your choosing. Viem, ethers, wagmi, web3 are all supported.

```tsx
import { happyProvider } from '@happychain/js'
```

## User Updates

User changes (logging in, logging out) can be subscribed to using the `onUserUpdate` function. Pass it the callback you wish to execute when user details are updated

```ts
import { onUserUpdate } from '@happychain/js'

onUserUpdate((user) => {
    if (!user) {
        // user is logged out
        return
    }

    // user is logged in, see HappyUser interface below
})
```

```ts
type HappyUser = {
    uid: string

    /**
     * Social
     */
    email: string
    name: string
    avatar: string

    /**
     * Connection Details
     */
    /** Connection Provider (rabby, metamask, google) */
    provider: string
    /** Connected Wallet Type */
    type: WalletType

    /**
     * On-Chain
     */
    /** Active Address's ENS */
    ens: string

    /** Currently active address */
    controllingAddress: `0x${string}`
    /** Associated smart account address */
    address: `0x${string}`
    /** All owned addresses */
    addresses: `0x${string}`[]
}
```
