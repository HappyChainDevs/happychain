import { atom, getDefaultStore } from "jotai"

const store = getDefaultStore()

export const bannersAtom = atom<string[]>([])

export const addBanner = (_banner: string) => {
    store.set(bannersAtom, (banners) => Array.from(new Set([...banners, _banner])))
}
