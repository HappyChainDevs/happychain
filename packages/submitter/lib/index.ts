import { env } from "./env"
import { app } from "./server"
import type { AppType } from "./server"

export type { AppType }
export { env, app }
export { makeResponse } from "#lib/routes/api/makeResponse"
export { makeResponseOld } from "#lib/routes/api/makeResponse"
