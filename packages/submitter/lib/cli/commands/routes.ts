import { inspectRoutes, showRoutes } from "hono/dev"
import { z } from "zod"
import { app } from "#lib/server"
import type { getCommand } from "../utils"

export function routesCommand({ values }: ReturnType<typeof getCommand>) {
    const options = z
        .object({
            verbose: z.boolean().default(false),
            json: z.boolean().default(false),
        })
        .parse(values)

    if (options.json) {
        const routes = inspectRoutes(app)
        if (options.verbose) console.log(JSON.stringify(routes))
        else console.log(JSON.stringify(routes.filter((a) => a.isMiddleware === false)))
    } else {
        showRoutes(app, { verbose: options.verbose })
    }
}
