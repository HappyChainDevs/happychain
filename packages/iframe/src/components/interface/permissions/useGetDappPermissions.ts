import { getAppPermissions } from "../../../services/permissions"
import type { AppURL } from "../../../utils/appURL"

const KEY_QUERY_GET_DAPP_PERMISSIONS = "GET_DAPP_PERMISSIONS"

function useGetDappPermissions(dappUrl: AppURL) {
    return {
        listAppPermissions: getAppPermissions(dappUrl),
    }
}

export { useGetDappPermissions, KEY_QUERY_GET_DAPP_PERMISSIONS }
