import { serve } from "@hono/node-server"
import app from "../server"
import { port } from "../utils/config"

const main = async () => {
    try {
        const server = serve(app, (_info) => {
            console.log(`Listening on http://localhost:${port}`)
        })

        process.on("SIGINT", async () => {
            console.log("\nShutting down gracefully...")
            server.close()
            process.exit(0)
        })

        process.on("uncaughtException", (error) => {
            console.error("Uncaught Exception:", error)
            // TODO Handle the error or exit the process as needed, leaving like this for now
        })
    } catch (error) {
        console.error("Error starting the server:", error)
        process.exit(1)
    }
}

main()
