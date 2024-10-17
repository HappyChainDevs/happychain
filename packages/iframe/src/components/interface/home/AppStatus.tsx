import { useHasPermissions } from "#src/hooks/useHasPermissions"
import { getAppURL } from "#src/utils/appURL"

const AppStatus = () => {
    const hasPermission = useHasPermissions("eth_accounts")
    return (
        <div className="flex w-full items-center justify-center relative text-sm font-bold">
            {`${hasPermission ? "✅" : "❌"} ${new URL(getAppURL()).host}`}
            <Link
                className="absolute inset-0 block z-10 size-full opacity-0"
                to="/embed/permissions/$dappId"
                params={{
                    dappId: encodeURI(getAppURL()),
                }}
            >
                View permissions
            </Link>
        </div>
    )
}

export default AppStatus
