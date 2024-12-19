import { Field, type FieldRootProps } from "@ark-ui/react"
import type { PropsWithChildren } from "react"

interface FieldInputProps extends FieldRootProps, PropsWithChildren {
    helperLabel: React.ReactNode
    errorLabel: React.ReactNode
}

export const FieldInput = (props: FieldInputProps) => {
    const { helperLabel, errorLabel, children, ...rootProps } = props
    return (
        <Field.Root className="flex flex-col items-start">
            {children}
            {rootProps.invalid === true ? (
                <Field.ErrorText>{errorLabel}</Field.ErrorText>
            ) : (
                <Field.HelperText className="text-start text-content text-xs">{props.helperLabel}</Field.HelperText>
            )}
        </Field.Root>
    )
}
