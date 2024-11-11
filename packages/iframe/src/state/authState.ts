import { accessorsFromAtom } from "@happychain/common"
import { AuthState } from "@happychain/sdk-shared"
import { atom } from "jotai"
import { StorageKey, storage } from "../services/storage"

const initialState = storage.get(StorageKey.HappyUser) ? AuthState.Initializing : AuthState.Disconnected

export const authStateAtom = atom<AuthState>(initialState)

export const { getValue: getAuthState, setValue: setAuthState } = accessorsFromAtom(authStateAtom)
