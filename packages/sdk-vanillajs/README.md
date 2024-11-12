# VanillaJS SDK

Framework-agnostic Vanilla JS / Typescript SDK.

## Quick Start

Register the webcomponent in your app

```js
import '@happychain/js'
```

then include somewhere in your html

```html
<!doctype html>
<html lang="en">
    <body>
        <happy-wallet></happy-wallet>
    </body>
</html>
```

Alternatively, you can call `register` to auto-register the component on the page

```js
import { register } from '@happychain/js'

register()
```

## EIP1193Provider

The raw eip1193provider is exposed directly, so you can initialize any compatible web3 library of your choosing. Viem, ethers, wagmi, web3 are all supported.

```jsx
import { happyProvider } from '@happychain/js'

// viem
const publicClient = createPublicClient({ transport: custom(provider) })
let walletClient
onUserUpdate((user) => {
    walletClient = user?.address ? createWalletClient({
        account: user.address,
        transport: custom(provider)
    })
})

// ethers v5
const ethersV5Provider = new ethers.providers.Web3Provider(provider)

// ethers v6
const ethersV6Provider = new BrowserProvider(provider)
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
