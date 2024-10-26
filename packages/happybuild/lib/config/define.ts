import type { BuildConfig } from "bun"
import type { cliArgs } from "../cli-args"
import type { Config } from "./types"

// === DEFINE CONFIG FUNCTION ======================================================================

/**
 * Type of the input of {@link defineConfig}, which can be a singular config, an array of configs,
 * or a factory function that returns either.
 */
export type DefineConfigParameters =
    | InputConfig
    | InputConfig[]
    | ((args: ConfigFactoryArgs) => InputConfig | InputConfig[])

/**
 * Argument type for the factory function that can be passed to {@link defineConfig}.
 */
export type ConfigFactoryArgs = { mode?: "production" | "development" | string } & typeof cliArgs

/**
 * Convenience function to define a single config or a set of build configs.
 *
 * The usual pattern is to export the result of this function from a `build.config.ts` file.
 * e.g. `export default defineConfig({ ... })`
 */
export function defineConfig(config: DefineConfigParameters): DefineConfigParameters {
    return config
}

// === INPUT CONFIG ================================================================================

/**
 * Type of config objects that can be provided by users when configuring HappyBuild.
 */
export type InputConfig = Partial<Omit<Config, InputConfigExclusions> & InputConfigOverrides>

/**
 * A set of keys omitted in HappyBuild's runtime {@link Config} to create the user-specified
 * {@link InputConfig}. Some of these keys are redefined in {@link InputConfigOverrides}.
 */
type InputConfigExclusions = "bunConfig" | "exports"

/**
 * Redefinition of keys in HappyBuild's runtime {@link Config} to create the user-specified
 * {@link InputConfig}.
 */
type InputConfigOverrides = {
    bunConfig: Partial<InputBunConfig>
    exports: ExportSpecifier[]
}

/**
 * Limited version of Bun's {@link BuildConfig} that excludes fields managed by HappyBuild that
 * cannot be set by users.
 */
export interface InputBunConfig extends Omit<BuildConfig, BunManagedKeys> {}

/**
 * Keys in Bun's {@link BuildConfig} that are managed by HappyBuild and cannot be set by users.
 */
type BunManagedKeys = "outdir" | "naming" | "entrypoints" | "root"

/**
 * Used to specify a package.json to export. Can either specify the export as a single string,
 * or the name along with a file to be used as the entrypoint file.
 */
export type ExportSpecifier =
    | string
    | {
          /**
           * Export name as it appears in package.json
           */
          name: string
          /**
           * Entrypoint file to generate the export from. Will be inferred if absent.
           */
          entrypoint?: string
          /**
           * Export condition to be used in the import statement, e.g. "import", "require",
           * "default", "browser". If not specified, {@link Config.defaultConditions} will be used.
           *
           * Note that when importing *other*  packages, Bun itself will use the first condition in
           * the file amongst its supported conditions:
           * https://bun.sh/docs/runtime/modules#importing-packages
           */
          condition?: string
      }
