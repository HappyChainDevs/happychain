import { type VariantProps, cva, cx } from "cva"
import { type GuiButtonVariantsProps, recipeGuiButton } from "../button/recipeGuiButton"
import { recipeGuiPanel } from "../panel/recipeGuiPanel"
const recipeGuiDialogBackdrop = cva({
    base: ["absolute inset-0 size-full"],
    variants: {
        mode: {
            default: "bg-hds-system-skeuo-surface-default",
        },
    },
    defaultVariants: {
        mode: "default",
    },
})

export type GuiDialogBackdropVariantsProps = VariantProps<typeof recipeGuiDialogBackdrop>

const recipeGuiDialogPositioner = cva({
    base: "flex overflow-auto absolute inset-0 size-full items-center justify-center",
})

export type GuiDialogPositionerVariantsProps = VariantProps<typeof recipeGuiDialogPositioner>

const recipeGuiDialogContent = cva({
    base: ["z-1 overflow-auto flex flex-col"],
    variants: {
        scale: {
            default: "",
        },
    },
    compoundVariants: [
        {
            scale: "default",
            class: "size-full p-2",
        },
    ],
    defaultVariants: {
        scale: "default",
    },
})

export type GuiDialogContentVariantsProps = VariantProps<typeof recipeGuiDialogContent> &
    VariantProps<typeof recipeGuiPanel>

/**
 * Visual pattern for modal dialog elements that mimic the minimalistic, retro look of early
 * graphics-based operating systems. Creates a complete dialog system with backdrop,
 * positioning, content, and trigger elements.
 *
 * This recipe consists of multiple related elements :
 * - backdrop: Full-screen overlay that sits behind the dialog
 * - positioner: Container that handles positioning the dialog in the viewport
 * - content: The actual dialog panel containing the interactive elements
 * - trigger: Button that opens the dialog
 * - closeTrigger: Button that closes the dialog
 *
 * The content element extends the GUI Panel recipe, combining its styling options.
 *
 * @variant `mode` (backdrop) - Controls the backdrop appearance
 * @variant `scale` (content) - Controls the size and padding of the content
 * @variant All variants from `recipeGuiPanel` are supported
 * @variant All variants from `recipeGuiButton` are supported on `trigger` and `closeTrigger`
 *
 * @example - Basic dialog composition
 * ```tsx
 * <div>
 *   <button className={recipeGuiDialog.trigger()}>
 *     Open Dialog
 *   </button>
 *
 *   <div className={recipeGuiDialog.backdrop({ mode: "default" })}></div>
 *
 *   <div className={recipeGuiDialog.positioner()}>
 *     <div className={recipeGuiDialog.content({
 *       presentation: "detached",
 *       scale: "default"
 *     })}>
 *       <h2>Dialog Title</h2>
 *       <p>This is the content of the dialog window.</p>
 *       <button className={recipeGuiDialog.closeTrigger({
 *         intent: "negative",
 *         aspect: "outline"
 *       })}>
 *         Close
 *       </button>
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * @note The backdrop covers the entire viewport and sits behind the dialog.
 * @note The positioner element centers the dialog in the viewport by default.
 * @note The content element combines the GUI panel recipe with additional dialog-specific styling.
 * @note For proper accessibility, dialogs should include proper ARIA attributes and focus management.
 */
export const recipeGuiDialog = {
    backdrop: (props: GuiDialogBackdropVariantsProps) => recipeGuiDialogBackdrop(props),
    positioner: (props: GuiDialogPositionerVariantsProps) => recipeGuiDialogPositioner(props),
    content: ({
        // dialog props
        scale = "default",
        // panel props
        coverage = "default",
        demarcation = "default",
        presentation = "detached",
    }: GuiDialogContentVariantsProps) =>
        cx(
            recipeGuiPanel({
                coverage,
                demarcation,
                presentation,
            }),
            recipeGuiDialogContent({ scale }),
        ),
    trigger: (props: GuiButtonVariantsProps) => recipeGuiButton(props),
    closeTrigger: (props: GuiButtonVariantsProps) => recipeGuiButton(props),
}

export type GuiDialogVariantsProps = VariantProps<typeof recipeGuiDialog.backdrop> &
    VariantProps<typeof recipeGuiDialog.positioner> &
    VariantProps<typeof recipeGuiDialog.content> &
    VariantProps<typeof recipeGuiDialog.trigger> &
    VariantProps<typeof recipeGuiDialog.closeTrigger>
