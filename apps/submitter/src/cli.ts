import { parseArgs } from "node:util"
import { showRoutes } from "hono/dev"
import { app } from "./server"

const { values } = parseArgs({
    args: Bun.argv,
    allowPositionals: true,
    options: {
        showRoutes: { type: "boolean" },
        verbose: { type: "boolean", default: false },
    },
})

if (values.showRoutes) showRoutes(app, { verbose: values.verbose })
