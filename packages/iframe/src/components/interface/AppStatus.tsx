import { useHasPermissions } from "../../hooks/useHasPermissions"
import { getDappOrigin } from "../../utils/getDappOrigin"

const dappOrigin = getDappOrigin()

const AppStatus = () => {
    const hasPermission = useHasPermissions("eth_accounts")
    return (
        <div className="flex w-full items-center justify-center text-sm font-bold">
            {`${hasPermission ? "✅" : "❌"} ${new URL(dappOrigin).host}`}
        </div>
    )
}

export default AppStatus
