import { createApp } from "vue"
import App from "./App.vue"
import { VueQueryPlugin, queryClient } from "./query"
import { WagmiPlugin, config } from "./wagmi"

import { HappyChainPlugin, happyChainSepolia } from "./sdk"

createApp(App)
    .use(HappyChainPlugin, { chainId: happyChainSepolia.id.toString() })
    .use(WagmiPlugin, { config })
    .use(VueQueryPlugin, { queryClient })
    .mount("#app")
