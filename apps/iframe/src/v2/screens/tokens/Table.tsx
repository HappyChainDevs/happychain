import { Dataview, Menu } from "@happy.tech/uikit-react"
import { useQuery } from "@tanstack/react-query"
import type { CellContext } from "@tanstack/react-table"
import { readContracts } from "@wagmi/core"
import type { ReadContractsReturnType } from "@wagmi/core"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import type { WatchAssetParameters } from "viem"
import { type Address, erc20Abi, formatUnits, isAddress } from "viem"
import { userAtom } from "#src/state/user"
import { removeWatchedAsset, watchedAssetsAtom } from "#src/state/watchedAssets"
import { config } from "#src/wagmi/config.ts"

enum TableTokensColumn {
    Symbol = "symbol",
    Balance = "balance",
    Meta = "meta",
}

type TokenMeta = {
    address: Address
    symbol: string
    decimals: number
}

type TableTokensRow = {
    [TableTokensColumn.Symbol]: string
    [TableTokensColumn.Balance]: string
    [TableTokensColumn.Meta]: TokenMeta
}

type TableTokensCellProps = CellContext<TableTokensRow, unknown>

type GetAllBalancesResult = ReadContractsReturnType<
    Array<{
        address: Address
        abi: typeof erc20Abi
        functionName: "balanceOf"
        args: [Address]
    }>,
    true
>

function useUserWatchedAssetsDataview() {
    const user = useAtomValue(userAtom)
    const watchedAssets = useAtomValue(watchedAssetsAtom)
    const userAssets = useMemo(() => {
        if (!user?.address) return [] as Array<WatchAssetParameters>
        const tokens = watchedAssets[user.address] || []
        return tokens.filter((asset) => asset.type === "ERC20") as Array<WatchAssetParameters>
    }, [user, watchedAssets])

    const placeholderData = useMemo(
        () =>
            userAssets.map(() => ({
                status: "success" as const,
                result: BigInt(0),
            })) as GetAllBalancesResult,
        [userAssets],
    )

    const queryBalances = useQuery({
        queryKey: ["", user?.address],
        enabled: isAddress(`${user?.address}`),
        placeholderData,
        queryFn: async () => {
            return (await readContracts(config, {
                contracts: userAssets.map((asset) => ({
                    address: asset.options.address as Address,
                    abi: erc20Abi,
                    functionName: "balanceOf",
                    args: [user!.address as Address],
                })),
            })) as GetAllBalancesResult
        },
        select: (data: GetAllBalancesResult) => {
            return data.map((row, key) => {
                return {
                    [TableTokensColumn.Symbol]: userAssets[key].options.symbol,
                    [TableTokensColumn.Balance]:
                        row.status === "success" && row.result
                            ? formatUnits(row.result as bigint, userAssets[key].options.decimals)
                            : "--.--",
                    [TableTokensColumn.Meta]: {
                        ...userAssets[key].options,
                    },
                } as TableTokensRow
            })
        },
    })

    return {
        query: queryBalances,
        data: queryBalances.data as Array<TableTokensRow>,
        columns: [
            {
                accessorKey: TableTokensColumn.Symbol,
                header: "Coin",
            },
            {
                accessorKey: TableTokensColumn.Balance,
                header: "Amount",
            },
            {
                accessorKey: TableTokensColumn.Meta,
                header: () => (
                    <span
                        className={`
                    w-4 aspect-square block
                    bg-current
                    mask-icon-hds-system-gui-funnel
                    [mask-position:center] [mask-size:contain] [mask-repeat:no-repeat] 
                `}
                    />
                ),
                cell: (props: TableTokensCellProps) => <TokenMenu meta={props.getValue<TokenMeta>()} />,
            },
        ],
    }
}

interface TokenMenuProps {
    meta: TokenMeta
}
const TokenMenu = (props: TokenMenuProps) => {
    const {
        meta: { address },
    } = props
    const user = useAtomValue(userAtom)

    return (
        <Menu.Root positioning={{ placement: "right-start" }} lazyMount unmountOnExit>
            <Menu.Gui.Trigger
                className={`
    bg-current
    w-4 aspect-square block
    mask-icon-hds-system-gui-ellipsis-outline
    [mask-position:center] [mask-size:contain] [mask-repeat:no-repeat] 

  `}
                aspect="dimmed"
            >
                <span className="sr-only">Open token menu</span>
            </Menu.Gui.Trigger>
            <Menu.Positioner className="[--z-index:1_!important]">
                <Menu.Gui.Content className="w-full">
                    <Menu.Gui.Item value="history">
                        <span data-part="icon" className="mask-icon-hds-system-gui-clock" /> History
                    </Menu.Gui.Item>
                    <Menu.Gui.Item value="website" className="relative">
                        <span data-part="icon" className="mask-icon-hds-system-gui-arrow-square-out" />
                        Website
                        <a
                            className="absolute z-1 block size-full inset-0 opacity-0"
                            href="/"
                            target="_blank"
                            rel="noreferrer"
                        >
                            View token website
                        </a>
                    </Menu.Gui.Item>
                    <Menu.Gui.Item
                        onClick={() => removeWatchedAsset(address, user!.address as Address)}
                        intent="negative"
                        value="untrack"
                    >
                        <span data-part="icon" className="mask-icon-hds-system-gui-minus-square" /> Stop tracking
                    </Menu.Gui.Item>
                </Menu.Gui.Content>
            </Menu.Positioner>
        </Menu.Root>
    )
}

export const TableTokens = () => {
    const { columns, data } = useUserWatchedAssetsDataview()

    return (
        <Dataview data={data} columns={columns}>
            <Dataview.Gui.Table>
                <Dataview.Gui.Header className="[&_[data-part=hds-dataview-table-header-cell]]:first:w-full">
                    <Dataview.Gui.Headers />
                </Dataview.Gui.Header>
                <Dataview.Gui.Body className="[&_tr_td]:nth-[2]:text-end">
                    <Dataview.Gui.Rows />
                </Dataview.Gui.Body>
            </Dataview.Gui.Table>
        </Dataview>
    )
}
