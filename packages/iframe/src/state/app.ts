import { atom } from 'jotai'

import { storage } from '../services/storage'

export enum AuthState {
    Unauthenticated = 'unauthenticated',
    Loading = 'loading',
    Authenticated = 'authenticated',
}

export const authStateAtom = atom<AuthState>(storage.get('cached-user') ? AuthState.Loading : AuthState.Unauthenticated)

authStateAtom.debugLabel = 'authStateAtom'
