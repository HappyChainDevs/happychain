import { testClient } from "hono/testing"
import { app } from "#lib/server.ts"

export const client = testClient(app)
