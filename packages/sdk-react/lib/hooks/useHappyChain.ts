import { eip1193Provider } from '@happychain/core'
import { useAtomValue } from 'jotai'

import { userAtom } from '../state/happyUser'

export function useHappyChain() {
    const user = useAtomValue(userAtom)

    return {
        provider: eip1193Provider,
        user,
    }
}
