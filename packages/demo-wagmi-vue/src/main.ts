import { createApp } from "vue"
import { VueQueryPlugin, queryClient } from "./query"
import { WagmiPlugin, config } from "./wagmi"
import "./style.css"
import App from "./App.vue"

import { HappyChainPlugin, chains } from "./sdk"

createApp(App)
    .use(HappyChainPlugin, { chain: chains.defaultChain })
    .use(WagmiPlugin, { config })
    .use(VueQueryPlugin, { queryClient })
    .mount("#app")
