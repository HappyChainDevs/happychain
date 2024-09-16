import { type HappyProvider, type HappyUser, getCurrentUser, happyProvider, onUserUpdate } from "@happychain/js"
import { type Ref, ref } from "vue"

const user = ref<HappyUser | undefined>(getCurrentUser())

onUserUpdate((_user) => {
    user.value = _user
})

export function useHappyChain(): { user: Ref<HappyUser | undefined>; happyProvider: HappyProvider } {
    return {
        user,
        happyProvider,
    }
}
