import { type HappyUser, getCurrentUser, onUserUpdate } from "@happy.tech/core"

// [!region onUserUpdate]
onUserUpdate((user) => {
    console.log("HappyChain User:", user)
})
// [!endregion onUserUpdate]

// [!region getCurrentUser]
const user = getCurrentUser()
console.log("HappyChain User:", user)
// [!endregion getCurrentUser]

// [!region getCurrentUserExample]
const doSomethingWithUser = (user?: HappyUser) => {
    console.log("HappyChain User:", user)
}

doSomethingWithUser(getCurrentUser())
onUserUpdate(doSomethingWithUser)
// [!endregion getCurrentUserExample]
