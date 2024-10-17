import type { BetterSqliteDriver } from "@mikro-orm/better-sqlite"
import { MikroORM } from "@mikro-orm/core"
import config from "./mikro-orm.config.js"

export let dbDriver: MikroORM<BetterSqliteDriver>

export async function startDbDriver() {
    dbDriver = await MikroORM.init<BetterSqliteDriver>(config)
}
