import { GuiTable, GuiTableBody, GuiTableCell, GuiTableHeader, GuiTableHeaderCell, GuiTableHeaders, GuiTableRow, GuiTableRows } from "./gui";
import { DataviewTable as Root } from "./use-dataview-table";

/**
 * A composable component that provides a flexible way to display, sort and filter data in tabular representation.
 * 
 * @see {@link https://tanstack.com/table/latest/docs/framework/react/examples/basic} tanstack table examples
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table} `<table>` element API Reference
 * 
 * @example - Basic usage with GUI styling
 * import { Dataview } from '@happy.tech/design-system';
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
 * 
 * @example - With manual rendering and custom cells
 * import { Dataview } from '@happy.tech/design-system';
 * import { flexRender } from '@tanstack/react-table';
 * 
 * const TableUsersData = () => {
 *   return (
 *     <Dataview data={data} columns={columns}>
 *       {(table) => (
 *         <Dataview.Gui.Table>
 *           <Dataview.Gui.Header>
 *             {table.getHeaderGroups().map((headerGroup) => (
 *               <Dataview.Gui.Row key={headerGroup.id}>
 *                 {headerGroup.headers.map((header) => (
 *                   <Dataview.Gui.HeaderCell key={header.id}>
 *                     {flexRender(
 *                       header.column.columnDef.header,
 *                       header.getContext()
 *                     )}
 *                   </Dataview.Gui.HeaderCell>
 *                 ))}
 *               </Dataview.Gui.Row>
 *             ))}
 *           </Dataview.Gui.Header>
 *           <Dataview.Gui.Body>
 *             {table.getRowModel().rows.map((row) => (
 *               <Dataview.Gui.Row key={row.id}>
 *                 {row.getVisibleCells().map((cell) => (
 *                   <Dataview.Gui.Cell key={cell.id}>
 *                     {flexRender(
 *                       cell.column.columnDef.cell,
 *                       cell.getContext()
 *                     )}
 *                   </Dataview.Gui.Cell>
 *                 ))}
 *               </Dataview.Gui.Row>
 *             ))}
 *           </Dataview.Gui.Body>
 *         </Dataview.Gui.Table>
 *       )}
 *     </Dataview>
 *   );
 * }
 * 
 * @example -  With sorting
 * import { Dataview } from '@happy.tech/design-system';
 * 
 * const SortableTable = () => {
 *   return (
 *     <Dataview 
 *       data={data} 
 *       columns={columns}
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
      Rows: GuiTableRows
    }
  })

  Dataview.displayName = "Dataview";
  