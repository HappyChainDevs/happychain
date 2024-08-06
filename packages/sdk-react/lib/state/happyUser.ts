import type { HappyUser } from '@happychain/core'
import { onUserUpdate } from '@happychain/core'
import { atom, getDefaultStore } from 'jotai'

export const userAtom = atom<HappyUser | null>(null)

const defaultStore = getDefaultStore()

// sync atom with localstorage
onUserUpdate((user) => {
    defaultStore.set(userAtom, user)
    localStorage.setItem('happychain:user', JSON.stringify(user))
})
