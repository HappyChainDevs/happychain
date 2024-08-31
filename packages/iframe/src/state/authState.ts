import { atom } from "jotai"

import { AuthState } from "@happychain/sdk-shared"
import { StorageKey, storage } from "../services/storage"
import { initListeners } from "./authState.listener"

const initialState = storage.get(StorageKey.HappyUser) ? AuthState.Connecting : AuthState.Disconnected
export const authStateAtom = atom<AuthState>(initialState)
authStateAtom.debugLabel = "authStateAtom"

initListeners(authStateAtom)
