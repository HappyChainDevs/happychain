/// <reference types="vite/client" />
/// <reference types="@happychain/firebase-web3auth-strategy/lib/vite-env" />
<<<<<<< HEAD

interface ImportMetaEnv {
||||||| parent of f01d873 (fix vite-env type exports)
interface ImportMetaEnv {
=======

export interface ImportMetaEnv {
>>>>>>> f01d873 (fix vite-env type exports)
    /**
     * App Setup
     */
    readonly VITE_DEFAULT_RPC_URL: string
}

<<<<<<< HEAD
// biome-ignore lint/correctness/noUnusedVariables: it augments the interface
interface ImportMeta {
||||||| parent of f01d873 (fix vite-env type exports)
interface ImportMeta {
=======
export interface ImportMeta {
>>>>>>> f01d873 (fix vite-env type exports)
    readonly env: ImportMetaEnv
}
