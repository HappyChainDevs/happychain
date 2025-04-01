import { type VariantProps, cva, cx } from "cva"
import { type GuiButtonVariantsProps, recipeGuiButton } from "../button/recipeGuiButton"
import { type GuiExpandableVariantsProps, recipeGuiExpandable } from "../expandable/recipeGuiExpandable"
import {
    type GuiFormFieldContainerVariantsProps,
    type GuiFormFieldLabelVariantsProps,
    recipeGuiFormField,
} from "../form-field/recipeGuiFormField"
import { type GuiPanelVariantsProps, recipeGuiPanel } from "../panel/recipeGuiPanel"
import type { GuiUserInputVariantsProps } from "../user-input/recipeGuiUserInput"

const recipeGuiComboboxContainer = cva({
    base: ["relative group"],
})

export type GuiComboboxContainerVariantsProps = VariantProps<typeof recipeGuiComboboxContainer> &
    GuiFormFieldContainerVariantsProps

const recipeGuiComboboxTrigger = cva({
    base: [
        "absolute top-1/2 -translate-y-1/2 end-0 h-full aspect-square",
        "data-[state=open]:**:data-expandable-indicator:rotate-180",
    ],
})
export type GuiComboboxTriggerVariantsProps = VariantProps<typeof recipeGuiComboboxTrigger> & GuiButtonVariantsProps

const recipeGuiComboboxPositioner = cva({
    base: ["absolute w-full bottom-0 start-0 translate-y-[calc(100%-2px)] translate-x-0 z-1"],
})
export type GuiComboboxPositionerVariantsProps = VariantProps<typeof recipeGuiComboboxPositioner>

const recipeGuiComboboxClearTrigger = cva({
    base: ["absolute translate-y-[calc(-100%-var(--spacing)*2))] end-0"],
})
export type GuiComboboxClearTriggerVariantsProps = VariantProps<typeof recipeGuiComboboxClearTrigger> &
    GuiButtonVariantsProps

const recipeGuiComboboxControl = cva({
    base: ["relative"],
})
export type GuiComboboxControlVariantsProps = VariantProps<typeof recipeGuiComboboxControl> & GuiExpandableVariantsProps

const recipeGuiComboboxContent = cva({
    base: ["flex flex-col group-has-[[data-scope=combobox][data-part=positioner]]:max-h-[130px] overflow-auto"],
})
export type GuiComboboxContentVariantsProps = VariantProps<typeof recipeGuiComboboxContent> & GuiPanelVariantsProps

export const recipeGuiCombobox = {
    container: (_props: GuiComboboxContainerVariantsProps) =>
        cx(recipeGuiFormField.parent({}), recipeGuiComboboxContainer()),
    input: (props: GuiUserInputVariantsProps) => recipeGuiFormField.input(props),
    positioner: (props: GuiComboboxPositionerVariantsProps) => recipeGuiComboboxPositioner(props),
    trigger: (props: GuiComboboxTriggerVariantsProps) => cx(recipeGuiButton(props), recipeGuiComboboxTrigger()),
    clearTrigger: (props: GuiButtonVariantsProps) => cx(recipeGuiButton(props), recipeGuiComboboxClearTrigger()),
    content: (props: GuiPanelVariantsProps) => cx(recipeGuiComboboxContent(), recipeGuiPanel(props)),
    control: (_props: GuiComboboxControlVariantsProps) => cx(recipeGuiComboboxControl({}), recipeGuiExpandable()),
    label: (props: GuiFormFieldLabelVariantsProps) => recipeGuiFormField.label(props),
}

export type GuiComboboxVariantsProps = VariantProps<typeof recipeGuiCombobox.container> &
    VariantProps<typeof recipeGuiCombobox.trigger> &
    VariantProps<typeof recipeGuiCombobox.input> &
    VariantProps<typeof recipeGuiCombobox.content>
