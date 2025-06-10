import { env } from "./env"
import { logger } from "./logger"

export async function sendSlackMessageToAlertChannel(message: string) {
    logger.error(message)
    if (env.NODE_ENV === "production") {
        await fetch(env.SLACK_WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: message }),
        })
    }
}
