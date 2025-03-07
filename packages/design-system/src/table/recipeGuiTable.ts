import { cva, type VariantProps } from "cva";

const recipeGuiTableRoot = cva({
    base: [
        "font-hds-system-gui-display border-separate w-full",
    ],
    variants: {
        scale: {
            default: "border-spacing-y-1 border-spacing-x-2"
        },
        columnsSizing: {
            auto: 'table-auto',
            fixed: 'table-fixed'
        },
    intent: {
        default: "text-hds-system-gui-foreground-default"
    }
    },
    defaultVariants: {
        intent: "default",
        scale: 'default',
        columnsSizing: "auto",
    }
})
export type GuiTableRootVariantsProps = VariantProps<typeof recipeGuiTableRoot>

const recipeGuiTableHeader = cva({
    variants: {
        intent: {
            default: 'text-hds-system-gui-foreground-default/50'
        },
        scale: {
            default: "tracking-hds-loose text-hds-system-gui-base",
        }
        
    },
    defaultVariants: {
        scale: "default",
        intent: 'default'
    }
})
export type GuiTableHeaderVariantsProps = VariantProps<typeof recipeGuiTableHeader>

const recipeGuiTableHeaderCell = cva({
    base: "font-[weight:var(--font-hds-weight-normal)]",
    variants: {
        scale: {
            default: "py-1",
        }
    },
    defaultVariants: {
        scale: 'default'
    }
})
export type GuiTableHeaderCellVariantsProps = VariantProps<typeof recipeGuiTableHeaderCell>


const recipeGuiTableBody = cva({
    base: "font-[weight:var(--font-hds-weight-normal)]",
    variants: {
        intent: {
            default: 'border-hds-system-gui-foreground-default/50'
        },
        scale: {
            default: "border-t text-hds-system-gui-base",
        }
    },
    defaultVariants: {
        intent: 'default',
        scale: 'default'
    }
})
export type GuiTableBodyVariantsProps = VariantProps<typeof recipeGuiTableBody>


/**
 * Visual pattern for tabular dataview elements that mimic the minimalistic, retro look of early
 * graphics-based operating systems. Provides styling for data tables with headers and body.
 * 
 * This recipe consists of multiple related elements:
 * - table: The root table element
 * - header: The table header section (thead)
 * - headerCell: Individual header cells (th)
 * - body: The table body section (tbody)
 * 
 * @variant `intent` - Controls the semantic meaning
 * @variant `scale` - Controls spacing, border spacing, and typography
 * @variant `columnsSizing` (table only) - Controls how column widths are calculated
 * 
 * @example - Complete table with header and body
 * ```tsx
 * <table className={recipeGuiTable.table()}>
 *   <thead className={recipeGuiTable.header()}>
 *     <tr>
 *       <th className={recipeGuiTable.headerCell()}>Name</th>
 *       <th className={recipeGuiTable.headerCell()}>Type</th>
 *       <th className={recipeGuiTable.headerCell()}>Amount</th>
 *     </tr>
 *   </thead>
 *   <tbody className={recipeGuiTable.body()}>
 *     <tr>
 *       <td>Asset A</td>
 *       <td>Token</td>
 *       <td>100</td>
 *     </tr>
 *     <tr>
 *       <td>Asset B</td>
 *       <td>NFT</td>
 *       <td>5</td>
 *     </tr>
 *   </tbody>
 * </table>
 * ```
 */
export const recipeGuiTable = {
    table: (props: GuiTableRootVariantsProps) => recipeGuiTableRoot(props),
    header: (props: GuiTableHeaderVariantsProps) => recipeGuiTableHeader(props),
    headerCell: (props: GuiTableHeaderCellVariantsProps) => recipeGuiTableHeaderCell(props),
    body: (props: GuiTableBodyVariantsProps) => recipeGuiTableBody(props),
}

export type GuiTableVariantsProps = 
  VariantProps<typeof recipeGuiTable.table> & 
  VariantProps<typeof recipeGuiTable.header> & 
  VariantProps<typeof recipeGuiTable.headerCell> &
  VariantProps<typeof recipeGuiTable.body>;