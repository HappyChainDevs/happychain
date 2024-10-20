/// <reference types="vitest" />
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { nodePolyfills } from "vite-plugin-node-polyfills"

// https://vitejs.dev/config/
export default defineConfig({
    server: { port: 5160 },
    plugins: [
        nodePolyfills({ globals: { Buffer: true } }), // required for web3Auth
        TanStackRouterVite(),
        react({
            babel: { presets: ["jotai/babel/preset"] },
        }),
    ],
    resolve: {
        alias: {
            crypto: "empty-module",
            assert: "empty-module",
            http: "empty-module",
            https: "empty-module",
            os: "empty-module",
            url: "empty-module",
            zlib: "empty-module",
            stream: "empty-module",
            _stream_duplex: "empty-module",
            _stream_passthrough: "empty-module",
            _stream_readable: "empty-module",
            _stream_writable: "empty-module",
            _stream_transform: "empty-module",
        },
    },
    build: {
        rollupOptions: {
            external: [
                "react",
                "viem",
                "@web3auth/base",
                "@web3auth/ethereum-mpc-provider",
                "@web3auth/mpc-core-kit",
                /\\.mocks$/,
            ],
        },
    },
    define: { global: "globalThis" }, // required for web3Auth

    test: {
        environment: "happy-dom",
    },
})
