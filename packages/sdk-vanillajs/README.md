# VanillaJS SDK

Native Web Component and vanillaJS/Typescript SDK (framework agnostic)

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
interface HappyUser {
    /**
     * Social Details
     */
    email: string
    name: string
    avatar: string

    /**
     * Currently active wallet address
     */
    address: `0x${string}`
}
```
