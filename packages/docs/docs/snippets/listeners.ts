import { type HappyUser, getCurrentUser, onUserUpdate } from "@happychain/js"

// [!region onUserUpdate]
onUserUpdate((user) => {
    console.log("HappyChain User: ", user)
})
// [!endregion onUserUpdate]

// [!region getCurrentUser]
const user = getCurrentUser()
console.log("HappyChain User: ", user)
// [!endregion getCurrentUser]

// [!region getCurrentUserExample]
const doSomethingWithUser = (user?: HappyUser) => {
    console.log("User is:", user)
}

doSomethingWithUser(getCurrentUser())
onUserUpdate(doSomethingWithUser)
// [!endregion getCurrentUserExample]
