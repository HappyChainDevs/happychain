import type { BetterSqliteDriver } from "@mikro-orm/better-sqlite"
import { MikroORM } from "@mikro-orm/core"
import config from "./mikro-orm.config.js"

export const dbDriver = await MikroORM.init<BetterSqliteDriver>(config)
