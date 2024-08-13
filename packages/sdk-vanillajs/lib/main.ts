import type { HappyProvider, HappyUser } from '@happychain/core'
import { happyProvider, onUserUpdate } from '@happychain/core'

import { HappyWallet } from './happy-wallet'

export { onUserUpdate, happyProvider, HappyWallet }
export type { HappyUser, HappyProvider }

export function register() {
    if (document.querySelector('happy-wallet')) {
        // don't register if already exists on page
        return
    }
    document.body.appendChild(new HappyWallet())
}
