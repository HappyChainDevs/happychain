import { useHasPermission } from "../../hooks/usePermissions"
import { getDappOrigin } from "../../utils/getDappOrigin"

const dappOrigin = getDappOrigin()

const AppStatus = () => {
    const hasPermission = useHasPermission()
    return (
        <div className="flex w-full items-center justify-center text-sm font-bold">
            {`${hasPermission({ eth_accounts: {} }) ? "✅" : "❌"} ${new URL(dappOrigin).host}`}
        </div>
    )
}

export default AppStatus
