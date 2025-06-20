import { env, isProduction } from "#lib/env"
import { logger } from "#lib/utils/logger.ts"
import type { UnionFill } from "@happy.tech/common"

export enum AlertType {
    BLOCK_PRODUCTION_HALTED = "BLOCK_PRODUCTION_HALTED",
    ALL_RPC_DOWN = "ALL_RPC_DOWN",
}

export enum AlertStatus {
    ALERTING = "ALERTING",
    RECOVERING = "RECOVERING",
    NORMAL = "NORMAL",
}

type AlertInformation = UnionFill<{
    status: AlertStatus.ALERTING
    unhealthyAt: Date
} | {
    status: AlertStatus.RECOVERING
    healthyAt: Date
    unhealthyAt: Date
} | {
    status: AlertStatus.NORMAL
}>



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
 * 
 * If an {@link AlertType} is provided, the alert will be tracked with a recovery mechanism.
 * When providing a type, you must call {@link notifyAlertIsHealthy} once the issue is resolved. 
 * After the alert has been healthy for longer than {@link RECOVERING_PERIOD_MS}, a recovery message will be sent.
 * 
 * @param message - The message to send to Slack.
 * @param type - The type of alert to notify about.
 */
export async function alert( message: string, type?: AlertType) {
    if (!isProduction || !env.SLACK_WEBHOOK_URL) return
    try {
        
        if (type) {    
            const info = alertsInformation[type]
            if (info.status === AlertStatus.RECOVERING) {
                alertsInformation[type] = {
                    status: AlertStatus.ALERTING,
                    unhealthyAt: info.unhealthyAt,
                    healthyAt: undefined
                }
            }
    
            if (info.status === AlertStatus.NORMAL) {
                alertsInformation[type] = {
                    status: AlertStatus.ALERTING,
                    unhealthyAt: new Date(),
                    healthyAt: undefined
                }
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


/**
 * Notify that an alert type is now healthy. If the alert stays healthy for longer than {@link RECOVERING_PERIOD_MS},
 * a recovery message will be sent to Slack in production if {@link env.SLACK_WEBHOOK_URL} is set.
 * 
 * @param type - The type of alert to notify about.
 * @param message - The message to send to Slack.
 */
export async function notifyAlertIsHealthy(type: AlertType, message: string) {
    if (alertsInformation[type].status === AlertStatus.ALERTING) {
        alertsInformation[type] = {
            status: AlertStatus.RECOVERING,
            healthyAt: new Date(),
            unhealthyAt: alertsInformation[type].unhealthyAt
        }
    }

    if (alertsInformation[type].status === AlertStatus.RECOVERING) {
        const healthyElapsedTime = Date.now() - alertsInformation[type].healthyAt.getTime()
        if (healthyElapsedTime > RECOVERING_PERIOD_MS) {
            alertsInformation[type] = {
                status: AlertStatus.NORMAL,
                healthyAt: undefined,
                unhealthyAt: undefined
            }

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