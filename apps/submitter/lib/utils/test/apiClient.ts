import { testClient } from "hono/testing"
import { app } from "#lib/server"

/** Hono test client. */
export const apiClient = testClient(app)
