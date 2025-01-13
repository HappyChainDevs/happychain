import { Hono } from "hono"
import { serveStatic } from "hono/bun"

const app = new Hono()

app.use("/static/*", serveStatic({ root: "./" }))
app.use("/favicon.ico", serveStatic({ path: "./favicon.ico" }))
app.get("/", (c) => c.text("You can access: /static/hello.txt"))
app.get("*", serveStatic({ path: "./static/fallback.txt" }))

// app.get('/', (c) => {
//   return c.text('Hello Honooo!')
// })

export default {
    port: 3000,
    fetch: app.fetch,
}
