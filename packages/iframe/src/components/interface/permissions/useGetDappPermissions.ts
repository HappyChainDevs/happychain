import { getAppPermissions, type AppPermissions } from "#src/state/permissions"
import type { AppURL } from "#src/utils/appURL"

function useGetDappPermissions(dappUrl: AppURL): AppPermissions {
    return getAppPermissions(dappUrl)
}

export { useGetDappPermissions }
