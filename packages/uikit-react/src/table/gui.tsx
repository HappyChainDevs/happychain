import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { flexRender } from "@tanstack/react-table";
import { cx } from "cva";
import { recipeGuiTable, type GuiTableBodyVariantsProps, type GuiTableHeaderCellVariantsProps, type GuiTableHeaderVariantsProps, type GuiTableRootVariantsProps, type GuiTableVariantsProps } from "@happy.tech/design-system";
import { useDataviewTable } from "./use-dataview-table";

interface GuiTableProps extends HTMLAttributes<HTMLTableElement> , GuiTableRootVariantsProps {}
export const GuiTable = forwardRef<HTMLTableElement, GuiTableProps>(
  ({ className = '', columnsSizing, intent, scale, ...props }, ref) => {
    return (
      <table
        ref={ref}
        className={cx(recipeGuiTable.table({ columnsSizing, intent, scale }), className)}
        {...props}
      />
    );
  }
);

interface GuiTableHeaderProps extends HTMLAttributes<HTMLTableSectionElement>, GuiTableHeaderVariantsProps{}
export const GuiTableHeader = forwardRef<HTMLTableSectionElement, GuiTableHeaderProps>(
  ({ className = '', scale, intent, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={cx(recipeGuiTable.header({ scale, intent }), className)}
        {...props}
      />
    );
  }
);

interface GuiTableRowProps extends HTMLAttributes<HTMLTableRowElement> {}
export const GuiTableRow = forwardRef<HTMLTableRowElement, GuiTableRowProps>(
  (props, ref) => {
    return (
      <tr
        ref={ref}
        {...props}
      />
    );
  }
);

interface GuiTableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {}
export const GuiTableCell = forwardRef<HTMLTableCellElement, GuiTableCellProps>(
  (props, ref) => {
    return (
      <td
        ref={ref}
        {...props}
      />
    );
  }
);

interface GuiTableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement>, GuiTableHeaderCellVariantsProps {}
export const GuiTableHeaderCell = forwardRef<HTMLTableCellElement, GuiTableHeaderCellProps>(
  ({ className = '', scale, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cx(recipeGuiTable.headerCell({ scale }), className)}
        {...props}
      />
    );
  }
);

interface GuiTableBodyProps extends HTMLAttributes<HTMLTableSectionElement>, GuiTableBodyVariantsProps {}
export const GuiTableBody = forwardRef<HTMLTableSectionElement, GuiTableBodyProps>(
  ({ className = '', intent, scale, ...props}, ref) => {
    return (
      <tbody
        ref={ref}
        className={cx(recipeGuiTable.body({ scale }), className)}
        {...props}
      />
    );
  }
);

export const GuiTableRows = () => {
  const table = useDataviewTable();
  return (
    <>
      {table.getRowModel().rows.map(row => (
        <GuiTableRow key={row.id}>
          {row.getVisibleCells().map(cell => (
            <GuiTableCell key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </GuiTableCell>
          ))}
        </GuiTableRow>
      ))}
    </>
  );
};

export const GuiTableHeaders = () => {
  const table = useDataviewTable();
  return (
    <GuiTableRow>
      {table.getHeaderGroups()[0].headers.map(header => (
        <GuiTableHeaderCell key={header.id}>
          {flexRender(
            header.column.columnDef.header,
            header.getContext()
          )}
        </GuiTableHeaderCell>
      ))}
    </GuiTableRow>
  );
};
