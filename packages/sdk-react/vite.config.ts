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
            external: ["react", "react-dom", "@happychain/js"],
            output: {
                globals: {
                    react: "React",
                    "react-dom": "ReactDOM",
                    "@happychain/js": "HappyChain",
                },
            },
        },

        copyPublicDir: false,
        sourcemap: true,
        emptyOutDir: true,
    },

    plugins: [
        react(),
        dts({
            // nicer output, but takes time
            insertTypesEntry: true,
            rollupTypes: true,
            aliasesExclude: ["react"],
            tsconfigPath: "./tsconfig.app.json",
            compilerOptions: {
                rootDir: "../",
            },
            bundledPackages: ["viem", "abitype", "@metamask/safe-event-emitter"],
            include: ["lib", "../sdk-vanillajs", "../sdk-shared", "../sdk-common"],
            exclude: ["**/*.test.tsx", "**/*.test.ts"],
        }),
    ],
})
