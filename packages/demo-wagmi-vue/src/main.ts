import { createApp } from "vue"
import App from "./App.vue"
import { VueQueryPlugin, queryClient } from "./query"
import { WagmiPlugin, config } from "./wagmi"

import { HappyChainPlugin, chains } from "./sdk"

createApp(App)
    .use(HappyChainPlugin, { chainId: chains.testnet.chainId })
    .use(WagmiPlugin, { config })
    .use(VueQueryPlugin, { queryClient })
    .mount("#app")
