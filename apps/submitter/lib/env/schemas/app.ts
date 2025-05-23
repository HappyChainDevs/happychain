import { z } from "zod"
import { isHexString } from "#lib/utils/validation/isHexString"

/**
 * Schema for configuration options related to misc operational concerns.
 */
export const appSchema = z.object({
    /**
     * A list of private keys which are used to submit boops onchain.
     *
     * Having multiple keys enables lowering latency and increasing throughput, as any boop that fails to be included
     * onchain will delay the boops queued after it on the same key.
     *
     * We guarantee that all boops for the same account that are in-flight at the same time will be queued on the same
     * key, which avoids invalid nonce issues.
     */
    EXECUTOR_KEYS: z.string().transform((str, ctx) => {
        const keys = str
            .split(",")
            .map((key) => key.trim())
            .filter((key) => key.length === 66 && key.startsWith("0x"))
        if (!keys.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "EXECUTOR_KEYS must be defined and contain at least one valid key",
            })
            return z.NEVER
        }

        return keys as `0x${string}`[]
    }),

    /**
     * The private key used to deploy user accounts on the `/api/v1/accounts/deploy` endpoint.
     * Defaults to the first key in {@link EXECUTOR_KEYS}.
     */
    PRIVATE_KEY_ACCOUNT_DEPLOYER: z.string().refine(isHexString).optional(),

    /**
     * Port the submitter will run on. Defaults to 3001.
     */
    SUBMITTER_PORT: z.coerce.number().default(3001),

    /**
     * The node environment to run in. One of "production", "staging",
     * "development", "test", or "cli". Defaults to "development".
     */
    NODE_ENV: z.enum(["production", "staging", "development", "test", "cli"]).default("development"),

    /**
     * The log level to use. One of "OFF", "TRACE", "INFO", "WARN", or "ERROR". Defaults to "INFO".
     */
    HAPPY_LOG_LEVEL: z.preprocess(
        (level) => level && String(level).toUpperCase(),
        z.enum(["OFF", "TRACE", "INFO", "WARN", "ERROR"]).default("INFO"),
    ),

    /**
     * URL for the SQLite database file this submitter is to use.
     */
    SUBMITTER_DB_PATH: z.string().default(":memory:"),

    /**
     * If true, runs the tests with an auto-mining Anvil, greatly lowering their run time, but skipping some tests
     * that are timing-dependent.
     */
    AUTOMINE_TESTS: z
        .string()
        .default("false")
        .transform((str) => str !== "false" && str !== "0"),
})
