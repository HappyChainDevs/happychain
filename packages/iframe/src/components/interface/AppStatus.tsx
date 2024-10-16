import { useHasPermissions } from "../../hooks/useHasPermissions"
import { getAppURL } from "../../utils/appURL"

const AppStatus = () => {
    const hasPermission = useHasPermissions("eth_accounts")
    return (
        <div className="flex w-full items-center justify-center text-sm font-bold">
            {`${hasPermission ? "✅" : "❌"} ${new URL(getAppURL()).host}`}
        </div>
    )
}

export default AppStatus
