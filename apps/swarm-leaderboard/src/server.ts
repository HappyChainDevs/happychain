import { Hono } from "hono"
import type { Person } from "./db/types"
import { initDb } from "./initDB"
import { createPerson, findPeople } from "./repository/PersonRepository"

const app = new Hono()

// GET /people
app.get("/people", async (c) => {
    try {
        const query = c.req.query()
        const criteria: Partial<Person> = {}
        if (query.id !== undefined) criteria.id = Number(query.id)
        if (query.first_name !== undefined) criteria.first_name = String(query.first_name)
        if (query.last_name !== undefined)
            criteria.last_name = query.last_name === "null" ? null : String(query.last_name)
        if (query.created_at !== undefined) criteria.created_at = new Date(String(query.created_at))
        const people = await findPeople(criteria)
        return c.json(people)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

// POST /people
app.post("/people", async (c) => {
    try {
        const body = await c.req.json()
        const { first_name, gender, last_name, created_at, metadata } = body
        if (!first_name || !gender || !created_at || !metadata) {
            return c.json({ error: "Missing required fields" }, 400)
        }
        const newPerson = await createPerson({
            first_name,
            gender,
            last_name: last_name === undefined ? null : last_name,
            created_at,
            metadata: JSON.stringify(metadata),
        })
        // Optionally, parse metadata back to object for response
        if (newPerson && typeof newPerson.metadata === "string") {
            try {
                newPerson.metadata = JSON.parse(newPerson.metadata)
            } catch {}
        }
        return c.json(newPerson, 201)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

export async function startServer(port: number) {
    await initDb()
    console.log(`Server running on port ${port}`)
    return Bun.serve({
        port,
        fetch: app.fetch,
    })
}
