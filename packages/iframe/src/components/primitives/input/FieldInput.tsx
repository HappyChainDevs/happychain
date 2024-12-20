import { Field, type FieldRootProps } from "@ark-ui/react"
import type { PropsWithChildren } from "react"

interface FieldInputProps extends FieldRootProps, PropsWithChildren {
    helperLabel: React.ReactNode
    errorLabel: React.ReactNode
}

export const FieldInput = (props: FieldInputProps) => {
    const { helperLabel, errorLabel, children, ...rootProps } = props
    return (
        <Field.Root
            className="flex flex-col items-start gap-1 w-full rounded-md"
            invalid={!rootProps.invalid}
            {...rootProps}
        >
            {children}
            {rootProps.invalid && (
                <Field.ErrorText className="text-start text-error text-xs">{errorLabel}</Field.ErrorText>
            )}
            {!rootProps.invalid && (
                <Field.HelperText className="text-start text-neutral-content/70 text-xs">
                    {props.helperLabel}
                </Field.HelperText>
            )}
        </Field.Root>
    )
}
