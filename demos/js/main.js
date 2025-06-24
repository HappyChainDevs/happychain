// register web component & import useful functions
import { connect, disconnect, getCurrentUser, happyProvider, loadHappyWallet, onUserUpdate } from "@happy.tech/core"
import { BrowserProvider } from "ethers"

// If included via a script tag through a CDN, then exports will be made available
// on the global HappyChain object
// const  { happyProvider, onUserUpdate, register } = window.HappyChain

// expose on window for demo purposes
window.happyProvider = happyProvider

loadHappyWallet({ chainId: import.meta.env.VITE_CHAIN_ID, disableStyles: true })

const ethersProvider = new BrowserProvider(happyProvider)

// buttons
const elSignMessageButton = document.querySelector("#sign-message-btn")
const elGetBlockButton = document.querySelector("#get-block-btn")
const elConnectButton = document.querySelector("#connect-btn")

// data dump elements
const elUserDump = document.querySelector("#user-dump")
const elSignatureDump = document.querySelector("#signature-dump")
const elBlockDump = document.querySelector("#block-dump")

onUserUpdate((user) => {
    if (!user) {
        // if theres no user, clear all dumps
        elUserDump.innerHTML = ""
        elSignatureDump.innerHTML = ""
        elBlockDump.innerHTML = ""
        elConnectButton.innerText = "Connect"
        return
    }

    elConnectButton.innerText = "Disconnect"
    // update user field
    elUserDump.innerHTML = JSON.stringify(user, null, 2)
})

elConnectButton.addEventListener("click", async () => {
    if (getCurrentUser()) {
        disconnect()
    } else {
        connect()
    }
})

elSignMessageButton.addEventListener("click", async () => {
    const signer = await ethersProvider.getSigner()
    // update signature field
    elSignatureDump.innerHTML = await signer.signMessage("Hello, World!")
})

elGetBlockButton.addEventListener("click", async () => {
    const result = await ethersProvider.getBlock("latest")
    elBlockDump.innerHTML = JSON.stringify(result, null, 2)
})
