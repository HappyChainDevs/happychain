import { resolve } from "node:path"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import { hmrPlugin, presets } from "vite-plugin-web-components-hmr"

export default defineConfig(({ mode }) => {
    return {
        plugins: [
            hmrPlugin({
                include: ["./lib/**/*.ts"],
                presets: [presets.lit],
            }),
            dts({
                insertTypesEntry: true,
                rollupTypes: true,
                bundledPackages: ["viem", "abitype", "@metamask/safe-event-emitter", "@happychain/sdk-shared"],
                tsconfigPath: "./tsconfig.json",
                compilerOptions: {
                    rootDir: "../",
                },
                exclude: ["**/*.test.tsx", "**/*.test.ts"],
            }),
        ],
        build: {
            lib: {
                name: "HappyChain",
                entry: "lib/index.ts",
                fileName: (format) => `index.${format}.js`,
            },
            rollupOptions: {
                input: {
                    // `vite dev` will complain it can't find the entrypoint if this is missing.
                    main: resolve(__dirname, "lib/index.ts"),
                },
                external: mode === "production" ? "" : /^lit-element/,
            },
            copyPublicDir: false,
            sourcemap: true,
            emptyOutDir: true,
        },
    }
})
