import { createContext, useContext } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type TableOptions,
  type Table as TanStackTable,
} from "@tanstack/react-table";

const DataviewTableContext = createContext<TanStackTable<any> | null>(null);
export interface DataviewTableProviderProps<TData> extends Partial<TableOptions<TData>> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  children: React.ReactNode;
}

export const DataviewTable = <TData,>({
    data,
    columns,
    children,
    ...options
  }: DataviewTableProviderProps<TData>) => {
    const table = useReactTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      ...options,
    });
  
    return (
      <DataviewTableContext.Provider value={table}>
        {children}
      </DataviewTableContext.Provider>
    );
  };

  DataviewTable.displayName = "DataviewTable";

export function useDataviewTable() {
  const context = useContext(DataviewTableContext);
  if (!context) {
    throw new Error("DataviewTable components must be used within a <DataviewTable></DataviewTable>");
  }
  return context;
};
