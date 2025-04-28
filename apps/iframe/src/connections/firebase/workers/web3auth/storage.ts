import { createStore, get, set } from "idb-keyval"

const web3AuthStore = createStore("web-3-auth-db", "web-3-auth-store")

export const web3AuthWorkerStorage = {
    async getItem(key: string) {
        return get(key, web3AuthStore)
    },
    async setItem(key: string, value: string) {
        return set(key, value, web3AuthStore)
    },
}
