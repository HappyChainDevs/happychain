import { chains } from '@happychain/sdk-shared'
import type { AddEthereumChainParameter } from 'viem'

import { findViemChain, walletClient } from './viem'

const btnStyles =
    'bg-slate-700 p-4 rounded shadow-lg transition hover:shadow-xl hover:bg-slate-600 hover:scale-[103%] active:scale-[98%] active:shadow-sm'.split(
        ' ',
    )

export function createAddChainBtn(chain: AddEthereumChainParameter) {
    const addBtn = document.createElement('button')
    addBtn.classList.add(...btnStyles)

    addBtn.innerText = `Add ${chain.chainName}`

    addBtn.addEventListener('click', async () => {
        if (!walletClient) {
            alert('functionality unavailable until connected')
            return
        }

        await walletClient.addChain({ chain: findViemChain(chain) })
        setActiveChain()
    })

    return addBtn
}

export function createSwitchChainBtn(chain: AddEthereumChainParameter) {
    const btn = document.createElement('button')
    btn.classList.add(...btnStyles)
    btn.innerText = `Switch To ${chain.chainName}`
    btn.addEventListener('click', async () => {
        if (!walletClient) {
            alert('functionality unavailable until connected')
            return
        }

        await walletClient.switchChain({ id: Number(chain.chainId) })
        setActiveChain()
    })
    return btn
}

export async function setActiveChain() {
    const chainNameText = document.querySelector('#chain-name')
    if (!chainNameText) {
        console.warn('failed to find chain name DOM node')
        return
    }

    const chainId = await walletClient.getChainId().then((n) => `0x${n.toString(16)}`)
    const active = Object.values(chains).find((a) => a.chainId === chainId)
    chainNameText.innerHTML = active?.chainName ?? 'unknown'
}
