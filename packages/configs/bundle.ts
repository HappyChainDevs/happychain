/**
 * Bundles the project using bun, with the default configuration, which can be overriden via
 * `configOverrides`.
 *
 * The usual thing to customize is to specify the list of external packages, which can sometimes
 * easily be obtained by imported the dependencies from `package.json` directly.
 *
 * If you want to be able to rebundle when a function change, you will also need to import your
 * entrypoints in the file that calls this function. By convention this file is also called
 * `bundle.ts` and lives at the root of each package. It is called via `make build` and `make
 * build.watch` when importing `typescript.mk`.
 */
export async function bundle(configOverrides?: Partial<Parameters<typeof Bun.build>[0]>) {
    const result = await Bun.build({
        root: ".",
        entrypoints: ["./lib/index.ts"],
        outdir: "./dist",
        minify: true,
        splitting: false,
        sourcemap: "linked",
        ...configOverrides,
    })

    if (!result.success) {
        console.error("Build failed")
        for (const message of result.logs) {
            console.log(message)
        }
    }
}
