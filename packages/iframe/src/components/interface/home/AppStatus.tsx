import { Link } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useHasPermissions } from "#src/hooks/useHasPermissions"
import { currentChainAtom } from "#src/state/chains.ts"
import { getAppURL } from "#src/utils/appURL"

const AppStatus = () => {
    const hasPermission = useHasPermissions("eth_accounts")
    const chain = useAtomValue(currentChainAtom)

    return (
        <div className="focus-within:bg-neutral/5 rounded-md flex w-full items-center justify-center relative text-sm font-bold">
            <Link
                to="/embed/permissions/$dappId"
                params={{ dappId: encodeURI(getAppURL()) }}
                className="flex items-center gap-2"
                title={`View ${new URL(getAppURL()).host} permissions`}
                aria-label={`View ${new URL(getAppURL()).host} permissions`}
            >
                {hasPermission ? "✅ " : "❌ "}
                <div className="text-center gap-2">
                    {new URL(getAppURL()).host} <small>({chain?.chainName})</small>
                </div>
            </Link>
        </div>
    )
}

export default AppStatus
