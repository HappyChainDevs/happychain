import { env, isProduction } from "#lib/env"
import { logger } from "#lib/utils/logger.ts"

export enum AlertType {
    BLOCK_PRODUCTION_HALTED = "BLOCK_PRODUCTION_HALTED",
    ALL_RPC_DOWN = "ALL_RPC_DOWN",
}

export enum AlertStatus {
    ALERTING = "ALERTING",
    RECOVERING = "RECOVERING",
    NORMAL = "NORMAL",
}

type AlertInformation = {
    status: AlertStatus
    healthyAt: Date | undefined
    unhealthyAt: Date | undefined
}

export const alertsInformation: Record<AlertType, AlertInformation> = {
    [AlertType.BLOCK_PRODUCTION_HALTED]: {
        status: AlertStatus.NORMAL,
        healthyAt: undefined,
        unhealthyAt: undefined
    },
    [AlertType.ALL_RPC_DOWN]: {
        status: AlertStatus.NORMAL,
        healthyAt: undefined,
        unhealthyAt: undefined,
    },
}

const RECOVERING_PERIOD_MS = 1000 * 60 // 1 minute


/**
 * Customize this to send alerts for particularly import errors that jeopardize the ability of the submitter to carry on
 * its task. The default behaviour is to send an alert to a slack channel if in production and `env.SLACK_WEBHOOK_URL`
 * is set.
 */
export async function alert( message: string, type?: AlertType) {
    if (!isProduction || !env.SLACK_WEBHOOK_URL) return
    try {
        
        if (type) {    
            const info = alertsInformation[type]
            if (info.status === AlertStatus.RECOVERING) {
                info.healthyAt = undefined
            }
    
            if (info.status === AlertStatus.NORMAL) {
                info.unhealthyAt = new Date()
            }
        }

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

export async function notifyAlertIsHealthy(type: AlertType, message: string) {
    if (alertsInformation[type].status === AlertStatus.ALERTING) {
        alertsInformation[type].status = AlertStatus.RECOVERING
        alertsInformation[type].healthyAt = new Date()
    }

    if (alertsInformation[type].status === AlertStatus.RECOVERING) {
        const healthyElapsedTime = Date.now() - alertsInformation[type].healthyAt!.getTime()
        if (healthyElapsedTime > RECOVERING_PERIOD_MS) {
            alertsInformation[type].status = AlertStatus.NORMAL
            alertsInformation[type].healthyAt = undefined
            alertsInformation[type].unhealthyAt = undefined

            if (!env.SLACK_WEBHOOK_URL) return

            await fetch(env.SLACK_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: `*[${new Date().toISOString()}]* ${message} \n *Environment:* ${env.NODE_ENV}`,
                }),
            })
        }
    }
}