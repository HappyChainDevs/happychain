import { getCommand, showHelp } from "./utils"

export async function processCmd(argv: string[]) {
    const { values, positionals, command } = getCommand(argv, ["routes", "migrate", "db-types"] as const)
    if (!command.success) {
        if (command.data) console.error(`Unknown command: ${command.data}`)
        if (command.data && command.error) console.error(`  => ${command.error?.flatten().formErrors[0]}`)
        showHelp()
        process.exit(1)
    }

    switch (command.data) {
        case "routes": {
            try {
                const { routesCommand } = await import("./commands/routes")
                routesCommand({ values, positionals, command })
            } catch (e) {
                console.error("Error loading routes command.", e)
                process.exit(1)
            }
            break
        }
        case "migrate": {
            const { migrateCommand } = await import("./commands/migrate")
            migrateCommand({ values, positionals, command })
            break
        }
        case "db-types": {
            try {
                const { generateDatabaseTypesCommand } = await import("./commands/generateDatabaseTypes")
                generateDatabaseTypesCommand()
            } catch {
                console.error("Error generating typescript definitions. Ensure 'kysely-codegen' is installed.")
                process.exit(1)
            }
            break
        }
        default: {
            showHelp()
            process.exit(1)
        }
    }
}
