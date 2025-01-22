import { Switch as ArkSwitch } from "@ark-ui/react"
import { type VariantProps, cva } from "class-variance-authority"
import type { ComponentProps } from "react"

/**
 * Brand styling for any UI element that implements a toggle behaviour
 */
const recipeToggle = cva(
    [
        // Group
        "flex items-center cursor-pointer flex-wrap ",
        // State: disabled
        "[&[data-disabled]]:opacity-60 [&[data-disabled]]:hover:cursor-not-allowed",
        // Control
        "[&_[data-part=control]]:flex [&_[data-part=control]]:items-center focus-within:[data-part=control]]:ring-offset-2",
        // Thumb
        "motion-safe:[&_[data-part=control]_[data-part=thumb]]:transition-all [&_[data-part=control]_[data-part=thumb]]:flex [&[data-state=checked]_[data-part=control]_[data-part=thumb]]:translate-x-[125%]",
    ],
    {
        variants: {
            intent: {
                default: [
                    // Toggle body
                    "[&_[data-part=control]]:border-neutral-content/50",
                    "dark:[&_[data-part=control]]:border-neutral-content/20",
                    "[&[data-state=unchecked]_[data-part=control]]:bg-base-300 hover:[&[data-state=unchecked]_[data-part=control]]:bg-base-300/75",
                    // Value: checked (toggle body)
                    "[&[data-state=checked]_[data-part=control]]:bg-primary hover:[&[data-state=checked]_[data-part=control]]:bg-primary/75",
                    //  focus-within
                    "focus-within:[data-part=control]]:ring-info/50",
                    // Toggle thumb
                    "[&_[data-part=control]_[data-part=thumb]]:bg-base-100 &_[data-part=control]_[data-part=thumb]]:border-base-100",
                    "dark:[&[data-state=unchecked]_[data-part=control]_[data-part=thumb]]:bg-neutral",
                    // Label
                    "text-base-content/75",
                ],
            },
            scale: {
                default: [
                    // Group
                    "py-1 gap-y-1 gap-x-3",
                    // Toggle body
                    "[&_[data-part=control]]:w-9 [&_[data-part=control]]:h-5",
                    "[&_[data-part=control]]:border",
                    "[&_[data-part=control]]:rounded-full",
                    "[&_[data-part=control]]:p-1",
                    "[&[data-state=checked]:focus-within_[data-part=control]]:ring-2",
                    // Toggle thumb
                    "[&_[data-part=control]_[data-part=thumb]]:size-3 [&_[data-part=control]_[data-part=thumb]]:rounded-full",
                    // Label
                    "text-xs",
                ],
            },
        },
        defaultVariants: {
            intent: "default",
            scale: "default",
        },
    },
)

type SwitchVariantsProps = VariantProps<typeof recipeToggle>

interface SwitchProps extends ComponentProps<typeof ArkSwitch.Root>, SwitchVariantsProps {
    switchLabel: React.ReactNode
}

/**
 * A control element that allows the user to toggle something on/off.
 * @see https://ark-ui.com/react/docs/components/switch - Component API
 * @see https://zagjs.com/components/react/switch#styling-guide - Styling reference
 */
const Switch = ({ className, switchLabel, intent, scale, ...rootProps }: SwitchProps) => {
    return (
        <ArkSwitch.Root {...rootProps} className={recipeToggle({ intent, scale, class: className ?? "" })}>
            <ArkSwitch.Control>
                <ArkSwitch.Thumb />
            </ArkSwitch.Control>
            <ArkSwitch.Label>{switchLabel}</ArkSwitch.Label>
            <ArkSwitch.HiddenInput />
        </ArkSwitch.Root>
    )
}
export { type SwitchProps, Switch, recipeToggle, type SwitchVariantsProps }
