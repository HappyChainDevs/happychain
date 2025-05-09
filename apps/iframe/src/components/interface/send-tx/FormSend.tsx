import { WarningCircle } from "@phosphor-icons/react"
import { useNavigate } from "@tanstack/react-router"
import { cx } from "class-variance-authority"
import { Button } from "#src/components/primitives/button/Button"
import { FormField, FormFieldLabel } from "#src/components/primitives/form-field/FormField"
import { Input } from "#src/components/primitives/input/Input"
import { recipeInput } from "#src/components/primitives/input/variant"
import { Fields, useFormSendAssets } from "#src/hooks/useFormSendAssets"

export const FormSend = () => {
    const navigate = useNavigate()
    const {
        recipient,
        amount,
        balance,
        handleOnSubmit,
        handleOnInput,
        inFlight,
        sending,
        waitingForInclusion,
        handleOnClickMax,
        recipientError,
        amountError,
    } = useFormSendAssets()

    const recipientHasError = !!recipientError && recipient !== ""
    const amountHasError = !!amountError && amount !== ""
    const hasFormErrors = recipientHasError || amountHasError
    const errorStyling = "bg-error/15 ring-1 ring-error/60 dark:bg-error/[0.08]"

    return (
        <form onSubmit={handleOnSubmit} className="w-full grid gap-4">
            <FormField>
                <FormFieldLabel htmlFor={Fields.Recipient}>To:</FormFieldLabel>
                <div className="grid gap-1">
                    <Input
                        readOnly={inFlight}
                        name={Fields.Recipient}
                        id={Fields.Recipient}
                        placeholder="0x..."
                        onInput={handleOnInput}
                        aria-describedby="help-recipient-address"
                        aria-invalid={recipientHasError}
                        pattern="^$|^0x[a-fA-F0-9]{40}$"
                        scale="small"
                        {...(recipientHasError && {
                            "aria-errormessage": "error-recipient-address",
                            inputClass: errorStyling,
                        })}
                    />
                    <p className="sr-only" id="help-recipient-address">
                        The Ethereum address you'll send the tokens to.
                    </p>
                    <p
                        className="indicator w-full text-[0.65rem] min-h-[1rem] font-medium"
                        id="error-recipient-address"
                    >
                        {recipientHasError && recipientError}
                    </p>
                </div>
            </FormField>
            <FormField>
                <div className="flex items-baseline justify-between gap-[1ex]">
                    <FormFieldLabel htmlFor={Fields.Amount}>Amount:</FormFieldLabel>
                    <p
                        className={cx(
                            "text-[0.6925em] font-medium inline-flex gap-[1ex] items-baseline",
                            balance === undefined ? "animate-pulse" : "",
                        )}
                    >
                        Your balance: {balance === undefined ? "--.--" : balance}
                    </p>
                </div>
                <div className="flex flex-col gap-1">
                    <div
                        className={recipeInput({
                            class: cx(
                                "relative flex justify-between gap-1",
                                amountHasError && "bg-error/15 ring-1 ring-error/60 dark:bg-error/[0.08]",
                            ),
                        })}
                    >
                        <input
                            // NOTE(norswap): This can't be a "type: number" because it will suppress the field value,
                            // preventing proper validation messages.
                            readOnly={balance === undefined || inFlight}
                            name={Fields.Amount}
                            id={Fields.Amount}
                            className="w-full focus:outline-none h-full bg-transparent"
                            placeholder="0.0"
                            value={amount}
                            onInput={handleOnInput}
                            aria-describedby="help-send-amount"
                            aria-invalid={amountHasError}
                            {...(amountHasError && { "aria-errormessage": "error-send-amount" })}
                        />
                        <Button
                            intent="ghost"
                            aria-disabled={inFlight || !balance}
                            className="text-xs"
                            type="button"
                            onClick={handleOnClickMax}
                        >
                            Max
                        </Button>
                    </div>
                    <p className="sr-only" id="help-send-amount">
                        The amount of tokens you want to send from your account.
                    </p>
                    <p className="indicator w-full text-[0.65rem] min-h-[1rem] font-medium" id="error-send-amount">
                        {amountHasError && amountError}
                    </p>
                </div>
            </FormField>

            {inFlight && (
                <div className="flex items-start bg-warning/40 border-warning text-warning-content/90 dark:bg-warning/5 dark:border-warning/20 dark:text-warning gap-2 text-sm border py-[1em] px-[1.25em] rounded-lg w-full">
                    <WarningCircle size="1.25em" className="shrink-0 mt-[0.15em]" />
                    <p>{`${!waitingForInclusion ? "Once sent, the" : "The"} transaction will not be cancelled!`}</p>
                </div>
            )}

            <div className="grid gap-4">
                <Button
                    className="justify-center"
                    intent="primary"
                    aria-disabled={inFlight || hasFormErrors}
                    isLoading={inFlight}
                    type="submit"
                >
                    {sending ? "Sending..." : waitingForInclusion ? "Confirming..." : "Send"}
                </Button>
                <Button
                    aria-disabled={inFlight}
                    onClick={() => {
                        if (inFlight) return
                        void navigate({ to: "/embed" })
                    }}
                    intent="ghost-negative"
                    className="justify-center"
                >
                    Go back
                </Button>
            </div>
        </form>
    )
}
