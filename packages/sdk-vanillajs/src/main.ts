import { chains, defaultChain } from "@happychain/sdk-shared"

import { onUserUpdate, register } from "../lib/index"

import { createAddChainBtn, createSwitchChainBtn, setActiveChain } from "./ui"

import "./style.css"

register({
    chain: "testnet",
})

const addChainList = document.querySelector("#add-chains")
const switchChainList = document.querySelector("#switch-chains")

for (const [, chain] of Object.entries(chains)) {
    const addBtn = createAddChainBtn(chain)
    addChainList?.append(addBtn)

    const switchBtn = createSwitchChainBtn(chain)
    switchChainList?.append(switchBtn)
}

document.querySelector("#refresh-chain")?.addEventListener("click", () => {
    setActiveChain()
})

onUserUpdate(() => setActiveChain())
