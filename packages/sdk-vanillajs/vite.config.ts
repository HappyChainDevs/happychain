import preact from "@preact/preset-vite"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig(({ mode }) => {
    return {
        plugins: [
            preact(),
            dts({
                insertTypesEntry: true,
                rollupTypes: mode === "production",
                tsconfigPath: "./tsconfig.lib.json",
                bundledPackages: ["preact", "viem", "abitype", "@metamask/safe-event-emitter", "@happychain/*"],
                compilerOptions: {
                    rootDir: "../",
                },
                include: ["lib", "../sdk-shared", "../common"],
                exclude: ["**/*.test.tsx", "**/*.test.ts"],
            }),
        ],
        build: {
            lib: {
                name: "HappyChain",
                entry: "lib/index.ts",
                fileName: (format) => `index.${format}.js`,
            },
            copyPublicDir: false,
            sourcemap: true,
            emptyOutDir: mode === "production",
        },
    }
})
