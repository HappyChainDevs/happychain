import { hasPermission } from "../../services/permissions/hasPermission"

const AppStatus = () => {
    return (
        <div className="flex w-full items-center justify-center text-sm font-bold">
            {`${hasPermission({ eth_accounts: {} }) ? "\u2705" : "\u274C"} ${
                document.referrer ? new URL(document.referrer).host : window.location.origin
            }`}
        </div>
    )
}

export default AppStatus
