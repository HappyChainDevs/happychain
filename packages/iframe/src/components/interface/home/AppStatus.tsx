import { useHasPermissions } from "../../../hooks/useHasPermissions"
import { getDappOrigin } from "../../../utils/getDappOrigin"

const AppStatus = () => {
    const hasPermission = useHasPermissions("eth_accounts")
    return (
        <div className="flex w-full items-center justify-center text-sm font-bold">
            {`${hasPermission ? "✅" : "❌"} ${new URL(getDappOrigin()).host}`}
        </div>
    )
}

export default AppStatus
