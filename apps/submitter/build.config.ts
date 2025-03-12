import { defineConfig } from "@happy.tech/happybuild"

export default defineConfig([
    {
        exports: ["."],
        bunConfig: {
            target: "bun",
        },
    },
    {
        exports: ["./client"],
        bunConfig: {
            // target: "bun",
        },
    },
])
