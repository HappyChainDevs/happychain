// register web-component & import useful functions
import { happyProvider, onUserUpdate, register } from '@happychain/js'
import { BrowserProvider } from 'ethers'

// If included via a script tag through a CDN, then exports will be made available
// on the global HappyChain object
// const  { happyProvider, onUserUpdate, register } = window.HappyChain

import './style.css'

register()

const ethersProvider = new BrowserProvider(happyProvider)

// buttons
const elSignMessageButton = document.querySelector('#sign-message-btn')
const elGetBlockButton = document.querySelector('#get-block-btn')

// data dump elements
const elUserDump = document.querySelector('#user-dump')
const elSignatureDump = document.querySelector('#signature-dump')
const elBlockDump = document.querySelector('#block-dump')

onUserUpdate((user) => {
    if (!user) {
        // if theres no user, clear all dumps
        elUserDump.innerHTML = ''
        elSignatureDump.innerHTML = ''
        elBlockDump.innerHTML = ''
        return
    }

    // update user
    const userString = JSON.stringify(user, null, 2)
    elUserDump.innerHTML = userString
})

elSignMessageButton.addEventListener('click', async () => {
    const signer = await ethersProvider.getSigner()
    const sig = await signer.signMessage('Hello, World!')
    elSignatureDump.innerHTML = sig
})

elGetBlockButton.addEventListener('click', async () => {
    const result = await ethersProvider.getBlock()
    elBlockDump.innerHTML = JSON.stringify(result, null, 2)
})
