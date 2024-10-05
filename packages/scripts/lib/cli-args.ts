import { parseArgs } from "node:util"

export const { values: cliArgs } = parseArgs({
    args: Bun.argv,
    options: {
        config: {
            type: "string",
            default: "build.config.ts",
        },
    },
    strict: true,
    allowPositionals: true,
})
