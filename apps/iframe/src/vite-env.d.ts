/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * App Config
     */
    readonly HAPPY_LOG_LEVEL: string

    /**
     * Firebase Setup
     */
    readonly HAPPY_FIREBASE_API_KEY: string
    readonly HAPPY_FIREBASE_AUTH_DOMAIN: string
    readonly HAPPY_FIREBASE_PROJECT_ID: string
    readonly HAPPY_FIREBASE_STORAGE_BUCKET: string
    readonly HAPPY_FIREBASE_MESSAGE_SENDER_ID: string
    readonly HAPPY_FIREBASE_APP_ID: string

    /**
     * Web3Auth Setup
     */
    readonly HAPPY_WEB3AUTH_CLIENT_ID: string
    readonly HAPPY_WEB3AUTH_NETWORK: "sapphire_mainnet" | "sapphire_devnet"
    readonly HAPPY_WEB3AUTH_VERIFIER: string

    readonly HAPPY_CHAIN_ID: string

    /**
     * Faucet Setup
     */
    readonly HAPPY_TURNSTILE_SITEKEY: string
    readonly HAPPY_FAUCET_ENDPOINT: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
