// import type { ConnectionProvider } from "@happychain/sdk-shared"
// import { signIn, signOut } from "./hooks/firebaseAuth.entry"
import { FirebaseConnector } from "./hooks/firebaseClass"
import { googleLogo } from "./logos"
import { web3AuthInit, web3EIP1193Provider } from "./services/web3auth"
// import { FirebaseConnector } from "./hooks/firebaseClass"

export async function init() {
    return await web3AuthInit()
}

// export { signIn, signOut, onAuthChange } from "./hooks/firebaseAuth.entry"
export { FirebaseConnector }
export const configs = {
    google: {
        name: "Google",
        icon: googleLogo,
    },
}
// export const providers = [
//     new FirebaseConnector(),
// ]

// export const providers = []

// export const providers = [
//     {
//         type: "social",
//         id: "social:firebase",
//         name: "Google",
//         icon: googleLogo,
//         enable: () => signIn("google"),
//         disable: () => signOut(),
//     },
// ] satisfies ConnectionProvider[]

export const defaultProvider = web3EIP1193Provider

// export { useFirebaseWeb3AuthStrategy } from "./hooks/useFirebaseWeb3AuthStrategy"

// export class FireBaseWeb3AuthProvider {
//     signIn() {} // signs in or throws. returns HappyUser after web3 is successful
//     signOut() {} // signs out or throws. returns undefined
//     onReconnect() {}
//     onConnect() {}
//     onDisconnect() {}
// }
