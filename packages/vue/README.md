# Vue SDK

Vue utilities for interacting with the Happy Wallet. 

For full documentation, visit https://docs.happy.tech/sdk/vue

For an example of the @happy.tech/vue library in action visit the demo: https://github.com/HappyChainDevs/happychain/tree/master/demos/vue

## Install

```sh
npm i @happy.tech/vue
```

## Setup

Use the `HappyChainPlugin` to provide wallet functionality to your Vue app

```tsx
import { HappyChainPlugin } from "@happy.tech/vue"
import { createApp } from "vue"
import App from "./App.vue"

createApp(App)
    .use(HappyChainPlugin)
    .mount("#app")
```

## useHappyWallet composable

The `useHappyWallet` composable returns the current authenticated user's data as
`HappyUser`, or `undefined` when no user is connected.

```vue
<script setup>
import { useHappyWallet } from '@happy.tech/vue'
const { user } = useHappyWallet()
</script>

<template>
<div v-if="user"> 
    <h1>{{ user.name }}</h1>
    <h2>{{ user.address}}</h2>
    <img :src="user.avatar" />
</div>
</template>
```
