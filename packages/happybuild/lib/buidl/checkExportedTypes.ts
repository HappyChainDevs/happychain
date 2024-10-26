import { $ } from "bun"
import chalk from "chalk"
import type { Config } from "../config/types"
import { pkg, pkgExportNames } from "../utils/globals"
import { spinner } from "../utils/spinner"
import { withOutputsInExportDirs } from "../utils/symlinks"

/**
 * Checks to see if the exported types are correctly packaged using AreTheTypesWrong (ATTW). This
 * runs for all exports in the package.
 */
export async function checkExportedTypes(configs: Config[]) {
    spinner.setText(`${pkg.name} — Checking for packaging issues...`)

    let output = ""
    // ATTW does not like symlinks
    await withOutputsInExportDirs(configs, { js: false, types: true }, async () => {
        output = await $`bun attw --pack --ignore-rules cjs-resolves-to-esm`.nothrow().text()
    })

    if (output.includes("No problems found")) return

    const numExports = pkgExportNames.length
    let error = false
    const lines = output
        .split("\n")
        .filter((line) => line.startsWith("\u001b[90m│"))
        .slice(1)
    for (const line of lines) {
        const okCount = (line.match(/🟢/g) || []).length
        if (okCount < numExports) {
            if (line.startsWith("\u001b[90m│\u001b[39m node10")) {
                // node10 does not support multiple exports, all will fail except the root export
                if (okCount < 1) {
                    error = true
                    break
                }
            } else {
                error = true
                break
            }
        }
    }
    if (!error) return

    if (process.env.CI) {
        // Strip out the intro comments and display ATTW's native warnings & tables.
        // The CI environment does not like the fancy formatting we do below.
        console.log(output.split("(ignoring rules: 'cjs-resolves-to-esm')")[1])
        return
    }

    // Prettify the table to make its display more compact.
    // Map the existing rows to a new array of row.
    // The first row is a list of packages being bundled.
    // Each subsequent row is a bundling target, followed by the results for every package.
    const rows = output
        .split("\n")
        .filter((a) => a.startsWith("\u001b[90m│"))
        .map((row) =>
            row
                .replaceAll("\u001b[90m", "") // grey color marker
                .replaceAll("\u001b[39m", "") // reset color marker
                .replaceAll("\u001b[31m", "") // red color marker
                .replaceAll('"', "")
                .trim()
                .split("│")
                .map((n) => n.trim())
                .filter(Boolean),
        )

    const headers = rows.shift() as string[]
    const table: Record<string, string>[] = []
    for (const row of rows) {
        const tableRow: Record<string, string> = {}
        tableRow[chalk.blue("target")] = row.shift()!
        for (const [i, result] of row.entries()) {
            tableRow[chalk.green(headers[i])] = result
        }
        table.push(tableRow)
    }
    console.table(table)
}
