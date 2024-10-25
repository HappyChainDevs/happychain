import { useHasPermissions } from "#src/hooks/useHasPermissions"
import { getAppURL } from "#src/utils/appURL"

const AppStatus = () => {
    const hasPermission = useHasPermissions("eth_accounts")
    return (
        <div className="focus-within:bg-neutral/5 rounded-md flex w-full items-center justify-center relative text-sm font-bold">
            <Link
                to="/embed/permissions/$dappId"
                params={{
                    dappId: encodeURI(getAppURL()),
                }}
                title={`View ${new URL(getAppURL()).host} permissions`}
                aria-label={`View ${new URL(getAppURL()).host} permissions`}
            >
                {`${hasPermission ? "✅" : "❌"} ${new URL(getAppURL()).host}`}
            </Link>
        </div>
    )
}

export default AppStatus
