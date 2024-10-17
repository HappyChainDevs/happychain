import { useHasPermissions } from "#src/hooks/useHasPermissions"
import { getAppURL } from "#src/utils/appURL"

const AppStatus = () => {
    const hasPermission = useHasPermissions("eth_accounts")
    return (
        <div className="flex w-full items-center justify-center text-sm font-bold">
            {`${hasPermission ? "✅" : "❌"} ${new URL(getAppURL()).host}`}
        </div>
    )
}

export default AppStatus
