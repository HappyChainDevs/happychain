import { useNavigate } from "@tanstack/react-router"
import { cx } from "class-variance-authority"
import { Button } from "#src/components/primitives/button/Button"
import { FormField } from "#src/components/primitives/form-field/FormField"
import { recipeInput } from "#src/components/primitives/input/variants"
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
            <FormField.Root
                readOnly={mutationSendTransaction.status === "pending" || queryWaitForTransactionReceipt.isLoading}
                invalid={!!formErrors?.fieldErrors[FieldFormSendAssets.Recipient]}
                required
            >
                <FormField.Label>To:</FormField.Label>
                <FormField.Input
                    name={FieldFormSendAssets.Recipient}
                    placeholder="0x..."
                    onInput={handleOnInput}
                    pattern="^$|^0x[a-fA-F0-9]{40}$"
                />
                <FormField.HelperText>The Ethereum address you'll send the tokens to.</FormField.HelperText>

                <FormField.ErrorText>{formErrors?.fieldErrors[FieldFormSendAssets.Recipient]}</FormField.ErrorText>
            </FormField.Root>
            <FormField.Root
                invalid={!!formErrors?.fieldErrors[FieldFormSendAssets.Amount]}
                required
                readOnly={
                    queryBalanceNativeToken.status !== "success" ||
                    queryWaitForTransactionReceipt.isLoading ||
                    mutationSendTransaction.status === "pending"
                }
            >
                <div className="flex items-baseline justify-between gap-[1ex]">
                    <FormField.Label htmlFor={FieldFormSendAssets.Amount}>Amount:</FormField.Label>
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
                        <FormField.Unstyled.Input
                            className="w-full focus:outline-none h-full bg-transparent"
                            placeholder="0.0"
                            step="any"
                            inputMode="decimal"
                            type="number"
                            min="0"
                            value={formValue[FieldFormSendAssets.Amount]}
                            max={maximumValueNativeToken}
                            onInput={handleOnInput}
                            name={FieldFormSendAssets.Amount}
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
                        <FormField.HelperText>
                            The amount of tokens you want to send from your account.
                        </FormField.HelperText>

                        <FormField.ErrorText>{formErrors?.fieldErrors[FieldFormSendAssets.Amount]}</FormField.ErrorText>
                    </div>
                </div>
            </FormField.Root>
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
