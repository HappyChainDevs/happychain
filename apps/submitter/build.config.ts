import { defineConfig } from "@happy.tech/happybuild"

export default defineConfig([
    {
        exports: [".", "./migrate"],
        bunConfig: {
            target: "bun",
            minify: false,
        },
    },
    {
        exports: ["./client"],
    },
])
