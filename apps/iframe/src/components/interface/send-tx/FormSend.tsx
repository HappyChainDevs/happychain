import { WarningCircle } from "@phosphor-icons/react"
import { useNavigate } from "@tanstack/react-router"
import { cx } from "class-variance-authority"
import { Button } from "#src/components/primitives/button/Button"
import { FormField, FormFieldLabel } from "#src/components/primitives/form-field/FormField"
import { Input } from "#src/components/primitives/input/Input"
import { recipeInput } from "#src/components/primitives/input/variant"
import { FieldFormSendAssets, useFormSendAssets } from "#src/hooks/useFormSendAssets"

export const FormSend = () => {
    const navigate = useNavigate()
    const {
        formAtom: [formValue],
        handleOnSubmit,
        handleOnInput,
        handleOnClickMaxNativeTokenBalance,
        queryBalanceNativeToken,
        queryWaitForTransactionReceipt,
        formErrors,
        mutationSendTransaction,
        maximumValueNativeToken,
    } = useFormSendAssets()

    return (
        <form onSubmit={handleOnSubmit} className="w-full grid gap-4">
            <FormField>
                <FormFieldLabel htmlFor={FieldFormSendAssets.Recipient}>To:</FormFieldLabel>
                <div className="grid gap-1 [&:has(input:user-invalid)_.indicator]:not-sr-only">
                    <Input
                        required
                        name={FieldFormSendAssets.Recipient}
                        id={FieldFormSendAssets.Recipient}
                        placeholder="0x..."
                        readOnly={
                            mutationSendTransaction.status === "pending" || queryWaitForTransactionReceipt.isLoading
                        }
                        onInput={handleOnInput}
                        aria-describedby="help-recipient-address"
                        aria-invalid={!!formErrors?.fieldErrors[FieldFormSendAssets.Recipient]}
                        pattern="^$|^0x[a-fA-F0-9]{40}$"
                        {...(formErrors?.fieldErrors[FieldFormSendAssets.Recipient] && {
                            "aria-errormessage": "error-recipient-address",
                        })}
                    />
                    <p className="sr-only" id="help-recipient-address">
                        The Ethereum address you'll send the tokens to.
                    </p>

                    {formErrors?.fieldErrors[FieldFormSendAssets.Recipient] && (
                        <p className="sr-only indicator w-full text-[0.65rem] font-medium" id="error-recipient-address">
                            {formErrors?.fieldErrors[FieldFormSendAssets.Recipient]}
                        </p>
                    )}
                </div>
            </FormField>
            <FormField>
                <div className="flex items-baseline justify-between gap-[1ex]">
                    <FormFieldLabel htmlFor={FieldFormSendAssets.Amount}>Amount:</FormFieldLabel>
                    <p
                        className={cx(
                            "text-[0.6925em] font-medium inline-flex gap-[1ex] items-baseline",
                            queryBalanceNativeToken?.status === "pending" ? "animate-pulse" : "",
                        )}
                    >
                        Your balance:{" "}
                        {queryBalanceNativeToken?.status !== "success" ? "--.--" : maximumValueNativeToken}
                    </p>
                </div>
                <div className="flex flex-col gap-1 [&:has(input:user-invalid)_.indicator]:not-sr-only">
                    <div
                        className={recipeInput({
                            class: "relative flex justify-between gap-1",
                        })}
                    >
                        <input
                            required
                            readOnly={
                                queryBalanceNativeToken.status !== "success" ||
                                queryWaitForTransactionReceipt.isLoading ||
                                mutationSendTransaction.status === "pending"
                            }
                            name={FieldFormSendAssets.Amount}
                            id={FieldFormSendAssets.Amount}
                            className="w-full focus:outline-none h-full bg-transparent"
                            placeholder="0.0"
                            step="any"
                            inputMode="decimal"
                            type="number"
                            min="0"
                            value={formValue[FieldFormSendAssets.Amount]}
                            max={maximumValueNativeToken}
                            onInput={handleOnInput}
                            aria-describedby="help-send-amount"
                            aria-invalid={!!formErrors?.fieldErrors[FieldFormSendAssets.Amount]}
                            {...(formErrors?.fieldErrors[FieldFormSendAssets.Amount] && {
                                "aria-errormessage": "error-send-amount",
                            })}
                        />
                        <Button
                            intent="ghost"
                            aria-disabled={
                                mutationSendTransaction.status === "pending" ||
                                queryWaitForTransactionReceipt.isLoading ||
                                maximumValueNativeToken === 0
                            }
                            className="text-xs"
                            type="button"
                            onClick={handleOnClickMaxNativeTokenBalance}
                        >
                            Max
                        </Button>
                    </div>
                    <div className="grid">
                        <p className="sr-only" id="help-send-amount">
                            The amount of tokens you want to send from your account.
                        </p>

                        {formErrors?.fieldErrors[FieldFormSendAssets.Amount] && (
                            <p className="sr-only indicator w-full text-[0.65rem] font-medium" id="error-send-amount">
                                {formErrors?.fieldErrors[FieldFormSendAssets.Amount]}
                            </p>
                        )}
                    </div>
                </div>
            </FormField>

            {mutationSendTransaction.status === "pending" && (
                <div className="flex items-start bg-warning/40 border-warning text-warning-content/90 dark:bg-warning/5 dark:border-warning/20 dark:text-warning gap-2 text-sm border py-[1em] px-[1.25em] rounded-lg w-full">
                    <WarningCircle size="1.25em" className="shrink-0 mt-[0.15em]" />
                    <p>
                        {`${!queryWaitForTransactionReceipt.isLoading ? "Once sent, the" : "the".replace(/^./, "T")} transaction will not be cancelled!`}
                    </p>
                </div>
            )}

            <div className="grid gap-4">
                <Button
                    className="justify-center"
                    intent="primary"
                    aria-disabled={
                        queryWaitForTransactionReceipt.isLoading ||
                        mutationSendTransaction.status === "pending" ||
                        !!formErrors
                    }
                    isLoading={mutationSendTransaction.status === "pending" || queryWaitForTransactionReceipt.isLoading}
                    type="submit"
                >
                    {mutationSendTransaction.status === "pending"
                        ? "Sending..."
                        : queryWaitForTransactionReceipt.isLoading
                          ? "Confirming..."
                          : "Send"}
                </Button>
                <Button
                    aria-disabled={
                        queryWaitForTransactionReceipt.isLoading || mutationSendTransaction.status === "pending"
                    }
                    onClick={() => {
                        if (mutationSendTransaction.status === "pending" || queryWaitForTransactionReceipt.isLoading)
                            return
                        navigate({ to: "/embed" })
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
