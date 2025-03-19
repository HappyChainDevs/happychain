import { Dialog as ArkDialog } from "@ark-ui/react/dialog"
import { GuiBackdrop, GuiCloseTrigger, GuiContent, GuiPositioner, GuiTrigger } from "./gui"

/**
 * A composable component the user can open/close to reveal a panel that overlays the
 * current content.
 * @see {@link https://ark-ui.com/react/docs/components/dialog} API Reference
 *
 * @example Basic dialog
 * ```tsx
 * import { Dialog } from '@happy.tech/uikit-react';
 *
 * const Basic dialog = () => {
 *   return (
 *     <Dialog.Root>
 *       <Dialog.Gui.Trigger aspect="outline">
 *         Click to reveal content
 *       </Dialog.Gui.Trigger>
 *       <Dialog.Backdrop />
 *       <Dialog.Positioner>
 *          <Dialog.Gui.Content>
 *            <Dialog.Title>A cool title</Dialog.Title>
 *            <Dialog.Description>A cool description</Dialog.Description>
 *            <Dialog.Gui.CloseTrigger>Click me to close</Dialog.Gui.CloseTrigger>
 *          </Dialog.Gui.Content>
 *       <Dialog.Positioner>
 *     </Dialog.Root>
 *   );
 * }
 * ```
 */
const Dialog = Object.assign({
    ...ArkDialog,
    Gui: {
        Positioner: GuiPositioner,
        Backdrop: GuiBackdrop,
        Content: GuiContent,
        Trigger: GuiTrigger,
        CloseTrigger: GuiCloseTrigger,
    },
})

export { Dialog }
