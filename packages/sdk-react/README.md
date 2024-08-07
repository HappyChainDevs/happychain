# React SDK

## Install

```sh
npm i @happychain/react
```

## Wallet Component

```jsx
import { HappyWallet } from '@happychain/react'

function App() {
    return (
        <main>
            <HappyWallet />
        </main>
    )
}
```

## useHappyChain hook

```jsx
import { useHappyChain } from '@happychain/react'

function App() {
    const { provider, user } = useHappyChain()

    // viem
    const publicClient = useMemo(() => createPublicClient({ transport: custom(provider) }), [provider])
    const walletClient = useMemo(
        () => (user?.address ? createWalletClient({ account: user.address, transport: custom(provider) }) : null),
        [provider, user?.address],
    )

    // ethers v5
    const ethersV5Provider = useMemo(() => new ethers.providers.Web3Provider(provider), [provider])

    // ethers v6
    const ethersV6Provider = useMemo(() => new BrowserProvider(provider), [provider])

    return <main>{/* ... */}</main>
}
```
