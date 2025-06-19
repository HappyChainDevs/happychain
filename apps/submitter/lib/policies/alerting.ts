import { env, isProduction } from "#lib/env"
import { logger } from "#lib/utils/logger.ts"

/**
 * Customize this to send alerts for particularly import errors that jeopardize the ability of the submitter to carry on
 * its task. The default behaviour is to send an alert to a slack channel if in production and `env.SLACK_WEBHOOK_URL`
 * is set. @param message
 */
export async function alert(message: string) {
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
