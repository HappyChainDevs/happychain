import type { Kysely } from "kysely"
import { db } from "#src/database"
import type { DB } from "#src/database/generated"

class HappyStateService {
    constructor(private db: Kysely<DB>) {}

    create() {}
    read() {}
    update() {}
    delete() {}
}

export const HappyState = new HappyStateService(db)
