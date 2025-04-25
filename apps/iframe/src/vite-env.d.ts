/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * App Config
     */
    readonly VITE_LOG_LEVEL: string

    /**
     * Firebase Setup
     */
    readonly VITE_FIREBASE_API_KEY: string
    readonly VITE_FIREBASE_AUTH_DOMAIN: string
    readonly VITE_FIREBASE_PROJECT_ID: string
    readonly VITE_FIREBASE_STORAGE_BUCKET: string
    readonly VITE_FIREBASE_MESSAGE_SENDER_ID: string
    readonly VITE_FIREBASE_APP_ID: string

    /**
     * Web3Auth Setup
     */
    readonly VITE_WEB3AUTH_CLIENT_ID: string
    readonly VITE_WEB3AUTH_NETWORK: "sapphire_mainnet" | "sapphire_devnet"
    readonly VITE_WEB3AUTH_VERIFIER: string

    /**
     * Account Abstraction
     */
    readonly VITE_CHAIN_ID: string
<<<<<<< HEAD

    /**
     * Faucet Setup
     */
    readonly VITE_TURNSTILE_SITEKEY: string
    readonly VITE_FAUCET_ENDPOINT: string
||||||| parent of 0b47781bf (Replace BUNDLER_RPC_URL with SUBMITTER_URL and implement Boop SDK)
=======
    readonly VITE_SUBMITTER_URL: string
>>>>>>> 0b47781bf (Replace BUNDLER_RPC_URL with SUBMITTER_URL and implement Boop SDK)
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
