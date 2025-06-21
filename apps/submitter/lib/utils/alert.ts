import type { UnionFill } from "@happy.tech/common"
import { env, isProduction } from "#lib/env"
import { AlertType, sendAlertPolicy } from "#lib/policies/alerting"
import { logger } from "#lib/utils/logger.ts"

enum AlertStatus {
    ALERTING = "ALERTING",
    RECOVERING = "RECOVERING",
    NORMAL = "NORMAL",
}

type AlertNormal = { status: AlertStatus.NORMAL }
type AlertAlerting = { status: AlertStatus.ALERTING; unhealthyAt: Date }
type AlertRecovering = { status: AlertStatus.RECOVERING; unhealthyAt: Date; healthyAt: Date }
type AlertInformation = UnionFill<AlertNormal | AlertAlerting | AlertRecovering>

/** Current recoverable alerts status. */
const alertInformation = {} as Record<AlertType, AlertInformation>
for (const alertType of Object.values(AlertType)) {
    alertInformation[alertType] = { status: AlertStatus.NORMAL }
}

/**
 * Customize this to send alerts for particularly import errors that jeopardize the ability of the submitter to carry on
 * its task. The default behaviour is to send an alert to a slack channel if in production and `env.SLACK_WEBHOOK_URL`
 * is set.
 *
 * If an {@link AlertType} is provided, the alert will be tracked with a recovery mechanism.
 *
 * When providing a type, you must call {@link recoverAlert} once the issue is resolved.
 * After the alert has been healthy for longer than {@link env.ALERT_RECOVERY_PERIOD}, a recovery message will be sent.
 */
export async function sendAlert(message: string, type?: AlertType) {
    if (!isProduction || !env.SLACK_WEBHOOK_URL) return
    if (type) {
        const info = alertInformation[type]
        if (info.status === AlertStatus.RECOVERING)
            alertInformation[type] = {
                status: AlertStatus.ALERTING,
                unhealthyAt: info.unhealthyAt,
                healthyAt: undefined,
            }
        if (info.status === AlertStatus.NORMAL)
            alertInformation[type] = {
                status: AlertStatus.ALERTING,
                unhealthyAt: new Date(),
                healthyAt: undefined,
            }
    }
    try {
        await sendAlertPolicy(message, type)
    } catch (error) {
        logger.error("Error sending alert:", error)
    }
}

/**
 * Notify that an alert type is now healthy. If the alert stays healthy for longer than {@link
 * env.ALERT_RECOVERY_PERIOD}, {@link sendAlertPolicy} will be called to send the recovery alert.
 */
export async function recoverAlert(message: string, type: AlertType) {
    if (alertInformation[type].status !== AlertStatus.ALERTING) return
    const healthyAt = new Date()
    alertInformation[type] = {
        status: AlertStatus.RECOVERING,
        healthyAt,
        unhealthyAt: alertInformation[type].unhealthyAt,
    }
    setTimeout(() => {
        const info = alertInformation[type]
        if (info.status !== AlertStatus.RECOVERING) return
        if (info.healthyAt !== healthyAt) {
            // The alert went through alerting in the meantime.
            // The by-reference date comparison is safe here.
            return
        }
        alertInformation[type] = { status: AlertStatus.NORMAL }
        sendAlertPolicy(message, type)
    }, env.ALERT_RECOVERY_PERIOD)
}
