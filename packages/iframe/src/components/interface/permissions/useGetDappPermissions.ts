import type { AppPermissions } from "#src/state/permissions.ts"
import { getAppPermissions } from "../../../services/permissions"
import type { AppURL } from "../../../utils/appURL"

function useGetDappPermissions(dappUrl: AppURL): AppPermissions {
    return getAppPermissions(dappUrl)
}

export { useGetDappPermissions }
