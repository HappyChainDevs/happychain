import { parseArgs } from "node:util"
import { z } from "zod"
import pkg from "../../package.json"

export function getCommand<TCommand extends [string, ...string[]]>(args: string[], commands: TCommand) {
    const { values, positionals } = parseArgs({ args, strict: false, allowPositionals: true })

    const command = z.enum(commands).safeParse(positionals[2])

    return {
        values,
        // trim path etc
        positionals: positionals.slice(3),
        command: {
            // include in data even if unknown
            data: positionals[2],
            ...command,
        },
    }
}

export function showHelp() {
    console.log(`
    HappyChain Submitter CLI ${pkg.version}
    Usage: submitter <command> [options]

    Commands:
        routes        Show routes
            --verbose   Verbose output
            --json      JSON output

        migrate       Migrate database
            latest      Migrate to latest
            up          Migrate up
            down        Migrate down
        `)
}
