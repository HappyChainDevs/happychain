import preact from "@preact/preset-vite"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

// https://vitejs.dev/config/
export default defineConfig(() => {
    return {
        plugins: [
            preact(),
            dts({
                insertTypesEntry: true,
                rollupTypes: true,
                bundledPackages: ["mipd", "react"],
                tsconfigPath: "./tsconfig.lib.json",
                compilerOptions: {
                    rootDir: "../",
                },
                exclude: ["**/*.test.tsx", "**/*.test.ts"],
            }),
        ],
        build: {
            lib: {
                entry: ["./lib/index.ts", "./lib/define.tsx", "./lib/badge.tsx"],
                fileName: (format, name) => `${name}.${format}.js`,
            },
        },
    }
})
