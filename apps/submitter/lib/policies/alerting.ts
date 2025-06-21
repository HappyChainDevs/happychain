import { env, isProduction } from "#lib/env"
import { logger } from "#lib/utils/logger.ts"

/**
 * Customize this to send alerts for particularly import errors that jeopardize the ability of the submitter to carry on
 * its task. The default behaviour is to send an alert to a slack channel if in production and `env.SLACK_WEBHOOK_URL`
 * is set.
 *
 * This is called from the `alert` function in `lib/utils/alerts.ts`, which also enables "recoverable alerts". See the
 * details over there. This function is called both for the initial alert and the recovery alert.
 */
export async function sendAlertPolicy(message: string, _type?: AlertType): Promise<void> {
    if (!isProduction || !env.SLACK_WEBHOOK_URL) return
    try {
        await fetch(env.SLACK_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: `*[${new Date().toISOString()}]* ${message} \n *Environment:* ${env.NODE_ENV}`,
            }),
        })
    } catch (error) {
        logger.error("Error sending Slack notification:", error)
    }
}

/**
 * Define alert types here to support recoverable alerts.
 */
export enum AlertType {
    BLOCK_PRODUCTION_HALTED = "BLOCK_PRODUCTION_HALTED",
}
