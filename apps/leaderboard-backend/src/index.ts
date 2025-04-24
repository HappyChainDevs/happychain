import { startServer } from "./server"

const port = Number(process.env.PORT) || 3000

startServer(port).catch((err) => {
    console.error("Failed to initialize database or start server:", err)
    process.exit(1)
})
