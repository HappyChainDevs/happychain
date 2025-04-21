import { type HappyUser, onUserUpdate } from "@happy.tech/core"
import { type Ref, ref } from "vue"

const user = ref<HappyUser | undefined>(undefined)

onUserUpdate((_user: HappyUser | undefined) => {
    user.value = _user
})

export function useHappyWallet(): { user: Ref<HappyUser | undefined> } {
    return { user }
}
