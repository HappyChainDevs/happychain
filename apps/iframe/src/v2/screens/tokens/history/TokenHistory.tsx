import { Link, useParams } from "@tanstack/react-router"
import { useMemo } from "react"
import type { Address } from "viem"
import { BottomNavbar, Scrollable } from "#src/v2/layouts/root/screen"
import { PATHNAME_ROUTE_TOKENS } from "#src/v2/screens/tokens/Tokens"
import { useWatchedAssets } from "#src/v2/screens/tokens/useWatchedAssets"
import { TableTokenHistory } from "./Table"

export const PATHNAME_ROUTE_TOKEN_HISTORY = "/embed/tokens/$tokenAdress/history"

export function useWatchedAssetData(address: Address) {
    const userAssets = useWatchedAssets({ type: "ERC20" })
    const token = useMemo(() => {
        return userAssets.filter((asset) => asset.options.address === address)?.[0]
    }, [userAssets, address])

    return token.options
}

export const ScreenTokenHistory = () => {
    const { tokenAdress } = useParams({ from: PATHNAME_ROUTE_TOKEN_HISTORY })
    const token = useWatchedAssetData(tokenAdress as Address)
    return (
        <>
            <h1 className="font-bold">{token.symbol}</h1>
            <Scrollable>
                <TableTokenHistory />
            </Scrollable>
        </>
    )
}

export const BottomNavbarTokenHistory = () => {
    return (
        <BottomNavbar asChild>
            <nav>
                <BottomNavbar.Item asChild>
                    <Link to={PATHNAME_ROUTE_TOKENS} className="gap-2">
                        <span
                            aria-hidden="true"
                            className="h-3.5 block aspect-square mask-icon-hds-system-gui-arrow-left bg-current"
                        />
                        <span>Back</span>
                    </Link>
                </BottomNavbar.Item>
            </nav>
        </BottomNavbar>
    )
}
