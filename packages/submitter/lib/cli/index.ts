import { migrateCommand } from "./commands/migrate"
import { routesCommand } from "./commands/routes"
import { getCommand, showHelp } from "./utils"

export async function processCmd(argv: string[]) {
    const { values, positionals, command } = getCommand(argv, ["routes", "migrate"] as const)
    switch (command.data) {
        case "routes":
            routesCommand({ values, positionals, command })
            break
        case "migrate":
            migrateCommand({ values, positionals, command })
            break
        default: {
            if (command.data) console.error(`Unknown command: ${command.data}`)
            if (command.data && command.error) console.error(`  => ${command.error?.flatten().formErrors[0]}`)
            showHelp()
            process.exit(1)
        }
    }
}
