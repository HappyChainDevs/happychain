import { inspectRoutes, showRoutes } from "hono/dev"
import { z } from "zod"
import type { getCommand } from "#lib/cli/utils"
import { app } from "#lib/server"

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
