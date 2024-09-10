import { resolve } from "node:path"

import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "./lib/index.ts"),
            name: "happychain",
            fileName: (format) => `index.${format}.js`,
        },
        rollupOptions: {
            external: ["react", "react-dom"],
            output: {
                globals: {
                    react: "React",
                    "react-dom": "ReactDOM",
                },
            },
        },
        copyPublicDir: false,
        sourcemap: true,
        emptyOutDir: true,
    },

    plugins: [
        dts({
            // nicer output, but takes time
            insertTypesEntry: false,
            // rollup types doesn't support 'as const'
            // https://github.com/microsoft/rushstack/issues/3875
            rollupTypes: false,
            aliasesExclude: ["react"],
            compilerOptions: {
                rootDir: "../",
            },
            bundledPackages: ["viem", "abitype", "@metamask/safe-event-emitter", "@happychain/sdk-shared"],
            tsconfigPath: "tsconfig.app.json",
            exclude: ["**/*.test.tsx", "**/*.test.ts"],
        }),
        react(),
    ],

    resolve: {
        alias: {
            "@happychain/js": resolve(__dirname, "../sdk-vanillajs/lib/index.ts"),
        },
    },
})
