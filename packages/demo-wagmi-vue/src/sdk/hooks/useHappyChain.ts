import { getCurrentUser, happyProvider, onUserUpdate } from "@happychain/js"
import { ref } from "vue"

const user = ref(getCurrentUser())

onUserUpdate((_user) => {
    user.value = _user
})

// TODO: move to vue.js SDK
export function useHappyChain() {
    return {
        user,
        happyProvider,
    }
}
