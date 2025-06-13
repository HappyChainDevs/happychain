import { testClient } from "hono/testing"
import { app } from "#lib/server"

/** Hono test client. */
export const client = testClient(app)
