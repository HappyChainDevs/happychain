import { Link } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useHasPermissions } from "#src/hooks/useHasPermissions"
import { currentChainAtom } from "#src/state/chains"
import { getAppURL } from "#src/utils/appURL"

export const AppStatus = () => {
    const hasPermission = useHasPermissions("eth_accounts")
    const chain = useAtomValue(currentChainAtom)

    return (
        <div className="z-10 mt-auto py-2 bg-base-200 sticky bottom-0 focus-within:bg-neutral/5 rounded-md flex w-full items-center justify-center text-xs font-bold">
            <Link
                to="/embed/permissions/$appURL"
                params={{ appURL: getAppURL() }}
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
