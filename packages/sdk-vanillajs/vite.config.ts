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
                rollupTypes: mode === "production",
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
            copyPublicDir: false,
            sourcemap: true,
            emptyOutDir: mode === "production",
        },
    }
})
