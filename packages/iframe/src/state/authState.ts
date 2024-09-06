import { AuthState } from "@happychain/sdk-shared"
import { atom } from "jotai"
import { StorageKey, storage } from "../services/storage"

const initialState = storage.get(StorageKey.HappyUser) ? AuthState.Connecting : AuthState.Disconnected

export const authStateAtom = atom<AuthState>(initialState)
