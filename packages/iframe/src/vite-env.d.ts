/// <reference types="vite/client" />

// extend strategies config
import '@happychain/firebase-web3auth-strategy/lib/vite-env'

interface ImportMetaEnv {
    /**
     * App Setup
     */
    readonly VITE_DEFAULT_RPC_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
