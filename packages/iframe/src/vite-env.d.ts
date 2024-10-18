/// <reference types="vite/client" />
/// <reference types="../connections/firebase/lib/vite-env" />

// biome-ignore lint/complexity/noBannedTypes: left for easy modifications
type ImportMetaEnv = {}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
