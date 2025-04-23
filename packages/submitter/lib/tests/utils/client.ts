import { testClient } from "hono/testing"
import { app } from "#lib/server"

export const client = testClient(app)
