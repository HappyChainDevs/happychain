import { createApp } from "vue"
import { VueQueryPlugin, queryClient } from "./query"
import { WagmiPlugin, config } from "./wagmi"
import "./style.css"
import App from "./App.vue"

createApp(App) //
    .use(WagmiPlugin, { config })
    .use(VueQueryPlugin, { queryClient })
    .mount("#app")
