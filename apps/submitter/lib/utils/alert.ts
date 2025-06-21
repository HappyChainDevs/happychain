import type { UnionFill } from "@happy.tech/common"
import { env } from "#lib/env"
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
 * Sends alerts for particularly import errors that jeopardize the ability of the submitter to carry on its task.
 * This calls the policy function {@link sendAlertPolicy} to actually carry out the alert reporting.
 *
 * If an {@link AlertType} is provided, the alert will be tracked with a recovery mechanism. You must call {@link
 * recoverAlert} once the issue is resolved. If {@link sendAlert} is called again with the same alert type while it is
 * still unhealthy, {@link sendAlertPolicy} will not be called again.
 */
export async function sendAlert(message: string, type?: AlertType) {
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
        if (info.status !== AlertStatus.NORMAL) return // don't re-alert
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
