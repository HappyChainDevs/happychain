// @ts-check
import { defineConfig } from "astro/config"

import react from "@astrojs/react"

import preact from "@astrojs/preact"

import vue from "@astrojs/vue"

import tailwind from "@astrojs/tailwind"

// https://astro.build/config
export default defineConfig({
    vite: {
        optimizeDeps: {
            force: true,
            exclude: ["@happychain/ui"],
        },
    },
    integrations: [
        react({
            include: ["**/react/*"],
        }),
        preact({
            include: ["**/preact/*"],
            // compat: true,
        }),
        vue({
            features: {
                customElement: ["connect-button"],
            },
            template: {
                compilerOptions: {
                    isCustomElement: (tag) => ["connect-button"].includes(tag),
                },
            },
        }),
        tailwind(),
    ],
})
