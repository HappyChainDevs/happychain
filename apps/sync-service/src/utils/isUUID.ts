import type { UUID } from "@happy.tech/common"
import { validate, version } from "uuid"

export function isUUID(str: string): str is UUID {
    return validate(str) && version(str) === 4
}
