import type { Migration, MigrationProvider } from "kysely"

export class ObjectMigrationProvider implements MigrationProvider {
    constructor(private migrations: Record<string, Migration>) {}

    async getMigrations(): Promise<Record<string, Migration>> {
        return this.migrations
    }
}
