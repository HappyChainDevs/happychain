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
                insertTypesEntry: false,
                // rollup types doesn't support 'as const'
                // https://github.com/microsoft/rushstack/issues/3875
                rollupTypes: false,
                bundledPackages: ["viem", "abitype", "@metamask/safe-event-emitter", "@happychain/sdk-shared"],
                tsconfigPath: "./tsconfig.lib.json",
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
                external: mode === "production" ? "" : /^lit-element/,
            },
            copyPublicDir: false,
            sourcemap: true,
            emptyOutDir: true,
        },
    }
})
