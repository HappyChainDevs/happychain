import { z } from "zod"
import { isHexString } from "#lib/utils/validation/helpers"

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
    APP_PORT: z.coerce.number().default(3001),

    /**
     * The node environment to run in. One of "production", "staging",
     * "development", "test", or "cli". Defaults to "development".
     */
    NODE_ENV: z.enum(["production", "staging", "development", "test", "cli"]).default("development"),

    /**
     * The log level to use. One of "OFF", "TRACE", "INFO", "WARN", or "ERROR". Defaults to "INFO".
     */
    LOG_LEVEL: z.preprocess(
        (level) => level && String(level).toUpperCase(),
        z.enum(["OFF", "TRACE", "INFO", "WARN", "ERROR"]).default("INFO"),
    ),

    /**
     * Whether to emit colored log output.
     */
    LOG_COLORS: z
        .string()
        .default("true")
        .transform((str) =>
            (() => {
                // biome-ignore format: terse
                try { return Boolean(JSON.parse(str.toLowerCase())) } 
                catch { return false }
            })(),
        ),

    /**
     * Whether to emit timestamps in logs (e.g. disable when running with systemd, which already adds timestamps)
     */
    LOG_TIMESTAMPS: z
        .string()
        .default("true")
        .transform((str) =>
            (() => {
                // biome-ignore format: terse
                try { return Boolean(JSON.parse(str.toLowerCase())) } 
                catch { return false }
            })(),
        ),

    /**
     * The minimum log level at which logs will be added as span events and emitted to the tracing system.
     * Span events provide detailed logging information within trace spans for debugging and monitoring.
     * Must be one of: "OFF", "TRACE", "INFO", "WARN", or "ERROR". Defaults to "TRACE".
     */
    SPAN_EVENT_LEVEL: z.preprocess(
        (level) => level && String(level).toUpperCase(),
        z.enum(["OFF", "TRACE", "INFO", "WARN", "ERROR"]).default("TRACE"),
    ),

    /**
     * URL for the SQLite database file this submitter is to use.
     */
    DATABASE_URL: z.string(),

    /**
     * If true, runs the tests with an auto-mining Anvil, greatly lowering their run time.
     * It is still beneficial to run the tests with an interval, to catch some issues that only show up in that scenario.
     */
    AUTOMINE_TESTS: z
        .string()
        .default("false")
        .transform((str) => str !== "false" && str !== "0"),

    /**
     * The endpoint to send traces to (e.g. Grafana Tempo endpoint).
     */
    TRACES_ENDPOINT: z.string().optional(),

    /**
     * The port to run the Prometheus metrics server on.
     */
    PROMETHEUS_PORT: z.coerce.number().default(9090),

    /**
     * The Slack webhook URL to send alerts to. If omitted, no alerts are sent (they are all logged anyway).
     */
    SLACK_WEBHOOK_URL: z.string().optional(),

    /**
     * The time in millisecond to make a recoverable alert (cf. `lib/utils/alert.ts`) as recovered after it
     * effectively recovered and didn't fail again. Defaults to 60s.
     */
    ALERT_RECOVERY_PERIOD: z.coerce.number().default(60_000),
})
