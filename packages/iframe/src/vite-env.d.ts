/// <reference types="vite/client" />
/// <reference types="@happychain/firebase-web3auth-strategy/lib/vite-env" />

interface ImportMetaEnv {
    /**
     * App Setup
     */
    readonly VITE_DEFAULT_RPC_URL: string
}

// biome-ignore lint/correctness/noUnusedVariables: it augments the interface
interface ImportMeta {
    readonly env: ImportMetaEnv
}
