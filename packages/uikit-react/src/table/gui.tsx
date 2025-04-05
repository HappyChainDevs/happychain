import {
    type GuiTableBodyCellVariantsProps,
    type GuiTableBodyVariantsProps,
    type GuiTableHeaderCellVariantsProps,
    type GuiTableHeaderVariantsProps,
    type GuiTableRootVariantsProps,
    type GuiTableRowVariantsProps,
    recipeGuiTable,
} from "@happy.tech/design-system"
import { flexRender } from "@tanstack/react-table"
import { cx } from "cva"
import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes, forwardRef } from "react"
import { useDataviewTable } from "./use-dataview-table"

interface GuiTableProps extends HTMLAttributes<HTMLTableElement>, GuiTableRootVariantsProps {}
export const GuiTable = forwardRef<HTMLTableElement, GuiTableProps>(
    ({ className = "", columnsSizing, intent, scale, ...props }, ref) => {
        return (
            <table
                ref={ref}
                data-part="hds-dataview-table"
                className={cx(recipeGuiTable.table({ columnsSizing, intent, scale }), className)}
                {...props}
            />
        )
    },
)

interface GuiTableHeaderProps extends HTMLAttributes<HTMLTableSectionElement>, GuiTableHeaderVariantsProps {}
export const GuiTableHeader = forwardRef<HTMLTableSectionElement, GuiTableHeaderProps>(
    ({ className = "", scale, intent, ...props }, ref) => {
        return (
            <thead
                ref={ref}
                data-part="hds-dataview-table-header"
                className={cx(recipeGuiTable.header({ scale, intent }), className)}
                {...props}
            />
        )
    },
)

interface GuiTableRowProps extends HTMLAttributes<HTMLTableRowElement>, GuiTableRowVariantsProps {}
export const GuiTableRow = forwardRef<HTMLTableRowElement, GuiTableRowProps>(
    ({ scale, type, className, ...props }, ref) => {
        return <tr ref={ref} className={cx(recipeGuiTable.row({ scale, type }), className)} {...props} />
    },
)

interface GuiTableCellProps extends TdHTMLAttributes<HTMLTableCellElement>, GuiTableBodyCellVariantsProps {}
export const GuiTableCell = forwardRef<HTMLTableCellElement, GuiTableCellProps>(
    ({ scale, className, ...props }, ref) => {
        return (
            <td
                data-part="hds-dataview-table-body-cell"
                ref={ref}
                className={cx(recipeGuiTable.headerCell({ scale }), className)}
                {...props}
            />
        )
    },
)

interface GuiTableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement>, GuiTableHeaderCellVariantsProps {}
export const GuiTableHeaderCell = forwardRef<HTMLTableCellElement, GuiTableHeaderCellProps>(
    ({ className = "", scale, ...props }, ref) => {
        return (
            <th
                ref={ref}
                data-part="hds-dataview-table-header-cell"
                className={cx(recipeGuiTable.headerCell({ scale }), className)}
                {...props}
            />
        )
    },
)

interface GuiTableBodyProps extends HTMLAttributes<HTMLTableSectionElement>, GuiTableBodyVariantsProps {}
export const GuiTableBody = forwardRef<HTMLTableSectionElement, GuiTableBodyProps>(
    ({ className = "", scale, ...props }, ref) => {
        return (
            <tbody
                ref={ref}
                data-part="hds-dataview-table-body"
                className={cx(recipeGuiTable.body({ scale }), className)}
                {...props}
            />
        )
    },
)

export const GuiTableRows = () => {
    const table = useDataviewTable()
    return (
        <>
            {table.getRowModel().rows.map((row) => (
                <GuiTableRow data-part="hds-dataview-table-body-row" type="body" key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                        <GuiTableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </GuiTableCell>
                    ))}
                </GuiTableRow>
            ))}
        </>
    )
}

export const GuiTableHeaders = () => {
    const table = useDataviewTable()
    return (
        <GuiTableRow data-part="hds-dataview-table-header-row" type="header">
            {table.getHeaderGroups()[0].headers.map((header) => (
                <GuiTableHeaderCell key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                </GuiTableHeaderCell>
            ))}
        </GuiTableRow>
    )
}
