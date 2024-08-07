import { atom } from 'jotai'

import { storage } from '../services/storage'

export enum AuthState {
    Unauthenticated = 'unauthenticated',
    Loading = 'loading',
    Authenticated = 'authenticated',
}
const initialState = storage.get('cached-user') ? AuthState.Loading : AuthState.Unauthenticated
export const authStateAtom = atom<AuthState>(initialState)
authStateAtom.debugLabel = 'authStateAtom'
