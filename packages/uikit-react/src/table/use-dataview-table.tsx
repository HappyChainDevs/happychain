import {
    type ColumnDef,
    type TableOptions,
    type Table as TanStackTable,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { type PropsWithChildren, createContext, useContext } from "react"

const DataviewTableContext = createContext<TanStackTable<unknown> | null>(null) // `unknown` to support different data structures

export interface DataviewTableProviderProps<TData> extends Partial<TableOptions<TData>>, PropsWithChildren {
    data: Array<TData>
    columns: Array<ColumnDef<TData, unknown>>
}

/**
 * A flexible wrapper around TanStack Table with access to the table instance.
 *
 * @template TData The type of data being displayed in the table.
 * @example
 * ```tsx
 * <DataviewTable
 *   data={people}
 *   columns={columns}
 *   state={{ sorting }}
 *   onSortingChange={setSorting}
 * >
 *   <MyTable />
 * </DataviewTable>
 * ```
 * @see {@link https://tanstack.com/table/latest/docs/overview} tanstack table API
 */
export const DataviewTable = <TData,>({ data, columns, children, ...options }: DataviewTableProviderProps<TData>) => {
    const table = useReactTable({
        data,
        columns,

        // Core table features.
        // These provide the basic interactive features for a table
        // (sorting, filtering and advanced column filtering...)
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getPaginationRowModel: getPaginationRowModel(),
        // Allow overriding defaults and adding extra features
        // (pagination, row selection, custom state management...)
        ...options,
    })

    // We need to work with any sort of data structure
    // hence `as unknown as`
    return (
        <DataviewTableContext.Provider value={table as unknown as TanStackTable<unknown>}>
            {children}
        </DataviewTableContext.Provider>
    )
}

DataviewTable.displayName = "DataviewTable"

/**
 * Internal hook consumed by <DataviewTable> components.
 * All table operations and state are available through this hook.
 *
 * @example
 * ```tsx
 * const MyTableRows = () => {
 *   const table = useDataviewTable();
 *   return table.getRowModel().rows.map(row => (
 *     <tr key={row.id}>
 *       {row.getVisibleCells().map(cell => (
 *         <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
 *       ))}
 *     </tr>
 *   ));
 * };
 * ```
 */
export function useDataviewTable(): TanStackTable<unknown> {
    const context = useContext(DataviewTableContext)
    if (!context) {
        throw new Error("useDataviewTable() must be used within a <DataviewTable> component")
    }
    return context
}
