/// <reference types="vite/client" />
/// <reference types="@happychain/firebase-web3auth-strategy/lib/vite-env" />

// biome-ignore lint/complexity/noBannedTypes: left for easy modifications
type ImportMetaEnv = {}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
