import { eip1193Provider, onUserUpdate } from '@happychain/core'

import { HappyWallet } from './happy-wallet'

export { onUserUpdate, eip1193Provider, HappyWallet }

export function register() {
    if (document.querySelector('happy-wallet')) {
        // don't register if already exists on page
        return
    }
    document.body.appendChild(new HappyWallet())
}
