import { testClient } from "hono/testing"
import { app } from "#lib/index" // import from index, not server, to start the services

/** Hono test client. */
export const apiClient = testClient(app)
