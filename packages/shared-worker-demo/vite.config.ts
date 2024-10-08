import { SharedWorkerRPCPlugin } from "@happychain/vite-plugin-shared-worker"
import preact from "@preact/preset-vite"

import { defineConfig } from "vite"

// const makePlugin = () => ({
//     name: "vite-plugin-chunk-split",
//     apply: "build",
//     enforce: "post",

//     // biome-ignore lint/suspicious/noExplicitAny: <explanation>
//     config(config: any) {
//         return {
//             ...config,
//             build: {
//                 ...config.build,
//                 rollupOptions: {
//                     ...config.build?.rollupOptions,
//                     output: {
//                         manualChunks(_id: string) {
//                             // if (id.includes(".shared-worker")) {
//                             return "built-chunk"
//                             // }
//                         },
//                     },
//                 },
//             },
//         }
//     },

//     transform(_: string, _id: string) {
//         console.log({ _id })
//         // if (id.includes("shared-worker")) {
//         return {
//             // moduleSideEffects: "no-treeshake",
//             // moduleS,
//         }
//         // }
//     },
// })

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        preact(),
        // SharedWorkerRPCPlugin(),
        // makePlugin(),
        // {
        //     name: "externalize",
        //     apply: "build",
        //     enforce: "pre",
        //     resolveId(_id) {
        //         // console.log({ id })
        //         // if (id === "./testing.shared-worker" || id === "@happychain/vite-plugin-shared-worker/runtime") {
        //         //     return { id, external: true }
        //         // }
        //     },
        // } as Plugin,
    ],
    optimizeDeps: {
        exclude: ["./src/testing.shared-worker.ts"],
    },
    // build: {
    //     minify: "terser",
    //     // minify: false,
    //     terserOptions: {
    //         mangle: false,
    //         compress: false,
    //         module: true,
    //     },
    //     // rollupOptions: {
    //     //     treeshake: false,
    //     // },
    // },
    worker: {
        // format: "iife",
        plugins: () => [
            // makePlugin() as Plugin,
            SharedWorkerRPCPlugin(),
            // {
            //     name: "externalize",
            //     apply: "build",
            //     enforce: "pre",
            //     resolveId(id) {
            //         console.log({ id })
            //         // if (id === "./testing.shared-worker") {
            //         // return { id, external: true }
            //         // }
            //     },
            // } as Plugin,
        ],
        format: "es",
        rollupOptions: {
            treeshake: true,
            output: {
                //...,
                // intro: 'const ENVIRONMENT = "production";',
                // preserveEntrySignatures: true,
                // preserveModules: true,
            },
        },
    },
    // build: {
    //     rollupOptions: {
    //         output: {
    //             manualChunks: {
    //                 "shared-workers": ["./src/testing.shared-worker"],
    //             },
    //         },
    //     },
    // },
})
