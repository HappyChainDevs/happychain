import { eip1193Provider, onUserUpdate } from '@happychain/core'

import { HappyWallet } from './happy-wallet'

export const happyProvider = eip1193Provider
export { onUserUpdate, HappyWallet }

export function register() {
    if (document.querySelector('happy-wallet')) {
        // don't register if already exists on page
        return
    }
    document.body.appendChild(new HappyWallet())
}
