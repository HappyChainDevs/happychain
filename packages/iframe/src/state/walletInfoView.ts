import { atom } from "jotai"

export enum ContentType {
    TOKENS = "Tokens",
    GAMES = "Games",
    ACTIVITY = "Activity",
}

export const walletInfoViewAtom = atom<ContentType>(ContentType.TOKENS)
