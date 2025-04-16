import "./env-bootstrap"
import { migrator } from "#lib/database/utils/migrator"

const { error } = await migrator.migrateToLatest()
if (error) {
    console.error(error)
    throw new Error("[Submitter] Failed to run test migrations")
}
