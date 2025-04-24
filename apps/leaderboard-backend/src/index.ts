import { initDb } from "./initDB"
import { app } from "./server"

const port = Number(process.env.PORT) || 3000

initDb()
    .then(() => {
        console.log(`Server running on port ${port}`)
        return Bun.serve({
            port,
            fetch: app.fetch,
        })
    })
    .catch((err) => {
        console.error("Failed to initialize database or start server:", err)
        process.exit(1)
    })
