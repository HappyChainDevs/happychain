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
    // CONNECTION

    /** Connection provider ("rabby", "metamask", "google", ...) */
    provider: string

    /** Type of the controlling EOA (Social, Injected) */
    type: WalletType

    // USER DETAILS

    /** Unique identifier */
    uid: string

    /** Email (if available, or empty) */
    email: string

    /** Display name (abbreviated address for Injected) */
    name: string

    /** Avatar URL (if available, or placeholder avatar) */
    avatar: string

    // ONCHAIN

    /** Happy account address */
    address: `0x${string}`

    /** EOA controlling the account */
    controllingAddress: `0x${string}`

    /** Active Address's ENS (if available, or empty) */
    ens: string
}
```
