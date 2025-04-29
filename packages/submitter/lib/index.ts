import { env } from "./env"
import { app } from "./server"
import type { AppType } from "./server"

export type { AppType }
export { env, app }
export { makeResponse } from "#lib/server/makeResponse"
export { makeResponseOld } from "#lib/server/makeResponse"
