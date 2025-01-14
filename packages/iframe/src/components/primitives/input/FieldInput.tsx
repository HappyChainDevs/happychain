import { Field, type FieldRootProps } from "@ark-ui/react"
import { Spinner } from "@phosphor-icons/react"
import type { PropsWithChildren } from "react"

interface FieldInputProps extends FieldRootProps, PropsWithChildren {
    helperLabel?: React.ReactNode
    errorLabel: React.ReactNode
    isLoading?: boolean
}

export const FieldInput = (props: FieldInputProps) => {
    const { helperLabel, errorLabel, isLoading, children, ...rootProps } = props
    return (
        <Field.Root
            className="flex flex-col items-start gap-1 w-full rounded-md"
            invalid={!rootProps.invalid}
            {...rootProps}
        >
            {children}
            <div className="flex flex-row h-3.5 w-full items-center justify-start">
                {rootProps.invalid && (
                    <Field.ErrorText className="text-start text-error/80 text-xs">{errorLabel}</Field.ErrorText>
                )}
                {!rootProps.invalid && (
                    <Field.HelperText className="text-start text-content/70 text-xs">
                        {props.helperLabel}
                    </Field.HelperText>
                )}

                {isLoading && (
                    <span data-loader className="pe-1">
                        <Spinner className="animate-spin text-[0.875em]" />
                    </span>
                )}
            </div>
        </Field.Root>
    )
}
