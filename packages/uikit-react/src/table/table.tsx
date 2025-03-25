import {
    GuiTable,
    GuiTableBody,
    GuiTableCell,
    GuiTableHeader,
    GuiTableHeaderCell,
    GuiTableHeaders,
    GuiTableRow,
    GuiTableRows,
} from "./gui"
import { DataviewTable as Root } from "./use-dataview-table"

/**
 * A composable component that provides a flexible way to display, sort and filter data in tabular representation.
 *
 * @see {@link https://tanstack.com/table/latest/docs/framework/react/examples/basic} tanstack table examples
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table} `<table>` element API Reference
 *
 * @example - Basic usage with GUI styling
 * ```tsx
 * import { Dataview } from '@happy.tech/uikit-react';
 *
 * const columns = [
 *   {
 *     accessorKey: 'name',
 *     header: 'Name'
 *   },
 *   {
 *     accessorKey: 'email',
 *     header: 'Email'
 *   }
 * ];
 *
 * const data = [
 *   { name: 'John Doe', email: 'john@example.com' },
 *   { name: 'Jane Smith', email: 'jane@example.com' }
 * ];
 *
 * const TableUsersData = () => {
 *   return (
 *     <Dataview data={data} columns={columns}>
 *       <Dataview.Gui.Table>
 *         <Dataview.Gui.Header>
 *           <Dataview.Gui.Headers />
 *         </Dataview.Gui.Header>
 *         <Dataview.Gui.Body>
 *           <Dataview.Gui.Rows />
 *         </Dataview.Gui.Body>
 *       </Dataview.Gui.Table>
 *     </Dataview>
 *   );
 * }
 * ```
 *
 * @example - With interactive sorting
 * ```tsx
 * import { Dataview } from '@happy.tech/uikit-react';
 * import { useState } from 'react';
 * import { SortingState } from '@tanstack/react-table';
 *
 * const SortableTable = () => {
 *   const [sorting, setSorting] = useState<SortingState>([]);
 *
 *   const columns = [
 *     {
 *       accessorKey: 'name',
 *       header: ({ column }) => {
 *         return (
 *           <button
 *             onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
 *             className="flex items-center gap-1"
 *           >
 *             Name
 *             {column.getIsSorted() === 'asc' && ' ⬆️'}
 *             {column.getIsSorted() === 'desc' && ' ⬇️'}
 *           </button>
 *         );
 *       }
 *     },
 *     {
 *       accessorKey: 'email',
 *       header: ({ column }) => (
 *         <button onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
 *           Email {column.getIsSorted() === 'asc' ? '↑' : column.getIsSorted() === 'desc' ? '↓' : ''}
 *         </button>
 *       )
 *     }
 *   ];
 *
 *   return (
 *     <Dataview
 *       data={data}
 *       columns={columns}
 *       state={{ sorting }}
 *       onSortingChange={setSorting}
 *       enableSorting={true}
 *     >
 *       <Dataview.Gui.Table>
 *         <Dataview.Gui.Header>
 *           <Dataview.Gui.Headers />
 *         </Dataview.Gui.Header>
 *         <Dataview.Gui.Body>
 *           <Dataview.Gui.Rows />
 *         </Dataview.Gui.Body>
 *       </Dataview.Gui.Table>
 *     </Dataview>
 *   );
 * }
 * ```
 *
 * @example - With filtering and pagination
 * ```tsx
 * import { Dataview } from '@happy.tech/uikit-react';
 * import { useState } from 'react';
 * import { PaginationState, getPaginationRowModel } from '@tanstack/react-table';
 *
 * const FilterableTable = () => {
 *   const [globalFilter, setGlobalFilter] = useState('');
 *   const [pagination, setPagination] = useState<PaginationState>({
 *     pageIndex: 0,
 *     pageSize: 10,
 *   });
 *
 *   return (
 *     <div>
 *       <input
 *         value={globalFilter ?? ''}
 *         onChange={e => setGlobalFilter(e.target.value)}
 *         placeholder="Search all columns..."
 *       />
 *
 *       <Dataview
 *         data={data}
 *         columns={columns}
 *         state={{
 *           globalFilter,
 *           pagination
 *         }}
 *         onGlobalFilterChange={setGlobalFilter}
 *         onPaginationChange={setPagination}
 *       >
 *         <Dataview.Gui.Table>
 *           <Dataview.Gui.Header>
 *             <Dataview.Gui.Headers />
 *           </Dataview.Gui.Header>
 *           <Dataview.Gui.Body>
 *             <Dataview.Gui.Rows />
 *           </Dataview.Gui.Body>
 *         </Dataview.Gui.Table>
 *
 *         <div data-part="pagination-control">
 *           <button
 *             onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
 *             aria-disabled={pagination.pageIndex === 0}
 *           >
 *             Previous
 *           </button>
 *           <span>
 *             Page {pagination.pageIndex + 1} of {Math.ceil(data.length / pagination.pageSize)}
 *           </span>
 *           <button
 *             onClick={() => setPagination(prev => ({
 *               ...prev,
 *               pageIndex: Math.min(
 *                 Math.ceil(data.length / prev.pageSize) - 1,
 *                 prev.pageIndex + 1
 *               )
 *             }))}
 *             aria-disabled={pagination.pageIndex >= Math.ceil(data.length / pagination.pageSize) - 1}
 *           >
 *             Next
 *           </button>
 *         </div>
 *       </Dataview>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example - With manual rendering and custom cells
 * ```tsx
 * import { Dataview, useDataviewTable } from '@happy.tech/uikit-react';
 * import { flexRender } from '@tanstack/react-table';
 *
 * const TableWithCustomCells = () => { // Define columns with custom cell renderers
 *   const columns = [
 *     {
 *       accessorKey: 'name',
 *       header: 'Name',
 *       cell: info => <span className="font-bold">{info.getValue()}</span>
 *     },
 *     {
 *       accessorKey: 'email',
 *       header: 'Email',
 *       cell: info => <a href={`mailto:${info.getValue()}`}>{info.getValue()}</a>
 *     },
 *     {
 *       id: 'actions',
 *       header: 'Actions',
 *       cell: ({ row }) => (
 *         <button onClick={() => alert(`Edit user: ${row.original.name}`)}>
 *           Edit
 *         </button>
 *       )
 *     }
 *   ];
 *
 *   return (
 *     <Dataview data={data} columns={columns}>
 *       <Dataview.Gui.Table>
 *         <Dataview.Gui.Header>
 *           <ManualHeaders />
 *         </Dataview.Gui.Header>
 *         <Dataview.Gui.Body>
 *           <ManualRows />
 *         </Dataview.Gui.Body>
 *       </Dataview.Gui.Table>
 *     </Dataview>
 *   );
 * }
 *
 *
 * const ManualHeaders = () => { // Custom component for rendering headers
 *   const table = useDataviewTable();
 *
 *   return (
 *     <>
 *       {table.getHeaderGroups().map((headerGroup) => (
 *         <Dataview.Gui.Row key={headerGroup.id}>
 *           {headerGroup.headers.map((header) => (
 *             <Dataview.Gui.HeaderCell key={header.id}>
 *               {flexRender(
 *                 header.column.columnDef.header,
 *                 header.getContext()
 *               )}
 *             </Dataview.Gui.HeaderCell>
 *           ))}
 *         </Dataview.Gui.Row>
 *       ))}
 *     </>
 *   );
 *};
 *
 * const ManualRows = () => { // Custom component for rendering rows
 *   const table = useDataviewTable();
 *   return (
 *     <>
 *       {table.getRowModel().rows.map((row) => (
 *         <Dataview.Gui.Row key={row.id}>
 *           {row.getVisibleCells().map((cell) => (
 *             <Dataview.Gui.Cell key={cell.id}>
 *               {flexRender(
 *                 cell.column.columnDef.cell,
 *                 cell.getContext()
 *               )}
 *             </Dataview.Gui.Cell>
 *           ))}
 *         </Dataview.Gui.Row>
 *       ))}
 *     </>
 *   );
 * };
 * ```
 */
export const Dataview = Object.assign(Root, {
    Gui: {
        Table: GuiTable,
        Header: GuiTableHeader,
        Body: GuiTableBody,
        Row: GuiTableRow,
        Cell: GuiTableCell,
        HeaderCell: GuiTableHeaderCell,
        Headers: GuiTableHeaders,
        Rows: GuiTableRows,
    },
})

Dataview.displayName = "Dataview"
