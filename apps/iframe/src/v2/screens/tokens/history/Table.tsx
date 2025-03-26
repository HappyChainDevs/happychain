import { Dataview, Format, Menu } from "@happy.tech/uikit-react"
import type { CellContext } from "@tanstack/react-table"
import { cva } from "cva"
import dayjs from "dayjs"

enum TableTokenHistoryColumn {
    Date = "date",
    Amount = "amount",
    Meta = "meta",
}

type TokenHistoryMeta = {
    activity: "receive" | "send" | "in-game"
} // @todo - update once design questions are cleared

type TableTokenHistoryRow = {
    [TableTokenHistoryColumn.Date]: Date
    [TableTokenHistoryColumn.Amount]: string
    [TableTokenHistoryColumn.Meta]: TokenHistoryMeta
}

type TableTokenHistoryCellProps = CellContext<TableTokenHistoryRow, unknown>

function useTokenHistoryDataview() {
    return {
        data: [], // @todo
        columns: [
            {
                accessorKey: TableTokenHistoryColumn.Date,
                header: "Date",
                cell: ({ getValue }: TableTokenHistoryCellProps) => dayjs(getValue<Date>()).format("DD/MM"),
            },
            {
                accessorKey: TableTokenHistoryColumn.Amount,
                header: "Amount",
                cell: ({ getValue }: TableTokenHistoryCellProps) => (
                    <Format.Number value={+getValue<string>()} notation="compact" compactDisplay="short" />
                ),
            },
            {
                accessorKey: TableTokenHistoryColumn.Meta,
                header: () => (
                    <span
                        className={`
                    ms-auto
                    w-4 aspect-square block
                    bg-current
                    mask-icon-hds-system-gui-funnel
                    [mask-position:center] [mask-size:contain] [mask-repeat:no-repeat] 
                `}
                    />
                ),
                cell: ({ getValue }: TableTokenHistoryCellProps) => (
                    <span className="flex items-center gap-2">
                        <ActivityIcon type={getValue<TokenHistoryMeta>().activity} />
                        <HistoryMenu />
                    </span>
                ),
            },
        ],
    }
}

const recipeActivityIcon = cva({
    base: [
        "ms-auto w-4 aspect-square block bg-current",
        "[mask-position:center] [mask-size:contain] [mask-repeat:no-repeat]",
    ],
    variants: {
        icon: {
            send: "mask-icon-hds-system-gui-arrow-up",
            receive: "mask-icon-hds-system-gui-arrow-down",
            "in-game": "mask-icon-hds-system-gui-gamepad",
        },
    },
})
interface ActivityIconProps {
    type: TokenHistoryMeta["activity"]
}
const ActivityIcon = ({ type }: ActivityIconProps) => {
    return (
        <span
            className={recipeActivityIcon({
                icon: type,
            })}
        />
    )
}

const HistoryMenu = () => {
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
                <span className="sr-only">Open history menu</span>
            </Menu.Gui.Trigger>
            <Menu.Positioner className="[--z-index:1_!important]">
                <Menu.Gui.Content className="w-full" />
            </Menu.Positioner>
        </Menu.Root>
    )
}

export const TableTokenHistory = () => {
    const { columns, data } = useTokenHistoryDataview()

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
