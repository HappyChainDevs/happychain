import pkg from "../package.json"
import env from "./env"
import { injectOpenAPIDocs } from "./routes/docs"
import { app } from "./server"

// Enable API Documentation page
injectOpenAPIDocs(app, {
    documentation: {
        info: {
            title: "Boop",
            version: pkg.version,
            description: "Happy Account Submitter",
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
