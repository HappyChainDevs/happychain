import { app, env } from "@happy.tech/submitter"
import pkg from "@happy.tech/submitter/package.json"
import { injectOpenAPIDocs } from "./docs"

// Enable API Documentation page
injectOpenAPIDocs(app, {
    documentation: {
        info: {
            title: "Boop",
            version: pkg.version,
            description: "Boop Submitter",
        },
        servers: [
            {
                url: "http://localhost:3001",
                description: "Local server",
            },
            {
                url: "https://boop.happy.tech",
                description: "Local server",
            },
        ],
    },
})

export default {
    port: env.APP_PORT,
    fetch: app.fetch,
}
