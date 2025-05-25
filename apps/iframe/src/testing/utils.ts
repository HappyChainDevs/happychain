import { LogLevel } from "@happy.tech/common"
import { afterAll, beforeAll } from "vitest"
import { defaultLogLevel, permissionsLogger } from "#src/utils/logger"

/**
 * Don't emit "no user found" warnings (disable beforeAll, re-enable afterAll).
 */
export function disablePermissionWarnings() {
    beforeAll(() => {
        // don't emit "no user found"  warnings
        permissionsLogger.setLogLevel(LogLevel.ERROR)
    })
    afterAll(() => {
        permissionsLogger.setLogLevel(defaultLogLevel)
    })
}
