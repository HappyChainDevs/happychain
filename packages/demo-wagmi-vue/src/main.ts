import { createApp } from "vue"
import { VueQueryPlugin, queryClient } from "./query"
import { WagmiPlugin, config } from "./wagmi"
import "./style.css"
import App from "./App.vue"

import { HappyChainPlugin } from "./sdk"

createApp(App) //
    .use(HappyChainPlugin, { chain: "sepolia" })
    .use(WagmiPlugin, { config })
    .use(VueQueryPlugin, { queryClient })
    .mount("#app")
