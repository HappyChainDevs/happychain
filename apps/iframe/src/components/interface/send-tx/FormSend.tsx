import { WarningCircle } from "@phosphor-icons/react"
import { useNavigate } from "@tanstack/react-router"
import { cx } from "class-variance-authority"
import { Button } from "#src/components/primitives/button/Button"
import { FormField } from "#src/components/primitives/form-field/FormField"
import { recipeInput } from "#src/components/primitives/form-field/variants.ts"
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

    const recipientHasError = Boolean(recipientError)
    const amountHasError = Boolean(amountError)
    const hasFormErrors = recipientHasError || amountHasError

    return (
        <form onSubmit={handleOnSubmit} className="w-full grid gap-4">
            <FormField.Root readOnly={inFlight} invalid={recipientHasError} required>
                <FormField.Label>To:</FormField.Label>
                <FormField.Input
                    name={Fields.Recipient}
                    placeholder="0x..."
                    onInput={handleOnInput}
                    pattern="^0x[a-fA-F0-9]{40}$"
                />
                <FormField.HelperText>The Ethereum address you'll send the tokens to.</FormField.HelperText>
                <FormField.ErrorText>{recipientError}</FormField.ErrorText>
            </FormField.Root>

            <FormField.Root invalid={amountHasError} required readOnly={balance === undefined || inFlight}>
                <div className="flex items-baseline justify-between gap-[1ex]">
                    <FormField.Label htmlFor={Fields.Amount}>Amount:</FormField.Label>
                    <p
                        className={cx(
                            "text-[0.6925em] font-medium inline-flex gap-[1ex] items-baseline",
                            balance === undefined ? "animate-pulse" : "",
                        )}
                    >
                        Your balance: {balance ?? "--.--"}
                    </p>
                </div>
                <div className="flex flex-col gap-1">
                    <div
                        className={recipeInput({
                            class: cx("relative flex justify-between gap-1"),
                        })}
                    >
                        <FormField.Unstyled.Input
                            // NOTE(norswap): This can't be a "type: number" because it will suppress the field value,
                            // preventing proper validation messages.
                            readOnly={balance === undefined || inFlight}
                            name={Fields.Amount}
                            id={Fields.Amount}
                            autoComplete="off"
                            className="w-full focus:outline-none h-full bg-transparent"
                            placeholder="0.0"
                            value={amount}
                            onInput={handleOnInput}
                        />
                        <Button
                            intent="ghost"
                            aria-disabled={inFlight || !balance}
                            className="text-xs"
                            type="button"
                            scale="xs"
                            onClick={handleOnClickMax}
                        >
                            Max
                        </Button>
                    </div>
                    <div className="grid">
                        <FormField.HelperText>
                            The amount of tokens you want to send from your account.
                        </FormField.HelperText>

                        <FormField.ErrorText>{amountError}</FormField.ErrorText>
                    </div>
                </div>
            </FormField.Root>

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
                    aria-disabled={inFlight || hasFormErrors || !recipient || !amount}
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
