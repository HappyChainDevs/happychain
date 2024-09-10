import { onUserUpdate, register } from "../lib/index"
import { chains, defaultChain } from "./chains"
import { createAddChainBtn, createAddWatchAssetBtn, createSwitchChainBtn, setActiveChain } from "./ui"

import "./style.css"

register({ chain: defaultChain })

const addChainList = document.querySelector("#add-chains")
const switchChainList = document.querySelector("#switch-chains")
const addTokens = document.querySelector("#add-token")

for (const [, chain] of Object.entries(chains)) {
    const addBtn = createAddChainBtn(chain)
    addChainList?.append(addBtn)

    const switchBtn = createSwitchChainBtn(chain)
    switchChainList?.append(switchBtn)
}

const addTokenBtn = createAddWatchAssetBtn()
addTokens?.append(addTokenBtn)

document.querySelector("#refresh-chain")?.addEventListener("click", () => {
    setActiveChain()
})

onUserUpdate(() => setActiveChain())
