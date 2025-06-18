import { env, isProduction } from "#lib/env"
import { logger } from "#lib/utils/logger.ts"

export async function notifySlack(message: string) {
    try {
        if (isProduction && env.SLACK_WEBHOOK_URL) {
            await fetch(env.SLACK_WEBHOOK_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: `*[${new Date().toISOString()}]* ${message} \n *Environment:* ${env.NODE_ENV}`,
                }),
            })
        }
    } catch (error) {
        logger.error("Error sending Slack notification:", error)
    }
}
