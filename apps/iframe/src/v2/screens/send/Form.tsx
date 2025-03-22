import { Button, Combobox, Field } from "@happy.tech/uikit-react"
import { useAtomValue } from "jotai"
import { type Address, isAddress } from "viem"
import { FieldFormSendAssets, type TokensComboboxItem, useFormSendAssets } from "#src/hooks/useFormSendAssets"
import { useTokenBalance } from "#src/hooks/useTokenBalance"
import { userAtom } from "#src/state/user"
import { Balance } from "#src/v2/components/Balance"

export const FormSendTokens = () => {
    const user = useAtomValue(userAtom)

    const {
        form,
        mutationSendTransaction,
        queryWaitForTransactionReceipt,
        tokens,
        handleTokensComboboxInputChange,
        handleTokensComboboxValueChange,
        maxTokenAmount,
    } = useFormSendAssets()

    return (
        <form
            id="send-token"
            onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
            }}
            className="flex flex-col isolate py-2 gap-3"
        >
            <form.Field
                name={FieldFormSendAssets.Token}
                // biome-ignore lint/correctness/noChildrenProp: tanstack-form API
                children={() => {
                    return (
                        <Field.Gui.Root>
                            <Combobox.Gui.Root
                                onInputValueChange={handleTokensComboboxInputChange}
                                collection={tokens.collection}
                                defaultValue={[tokens.defaultSelection.value]}
                                onValueChange={({ items }: { items: Array<TokensComboboxItem> }) => {
                                    const selected = items[0]
                                    handleTokensComboboxValueChange(selected)
                                }}
                            >
                                <Combobox.Gui.Label>Token</Combobox.Gui.Label>
                                <Combobox.Gui.Control>
                                    <Combobox.Gui.Input />
                                    <Combobox.Gui.Trigger>
                                        <span className="sr-only">Open tokens list</span>
                                    </Combobox.Gui.Trigger>
                                </Combobox.Gui.Control>
                                <Combobox.Gui.Positioner>
                                    <Combobox.Gui.Content>
                                        {tokens.collection.items.map((item) => (
                                            <Combobox.Gui.Item
                                                className="flex-row-reverse"
                                                data-scope="token"
                                                key={item.value}
                                                item={item}
                                            >
                                                <Combobox.Gui.ItemText className="relative [&:has([data-part=address])]:pb-[2ch] w-full flex justify-between overflow-hidden">
                                                    <span className="flex flex-col">
                                                        <span data-scope="token" data-part="label">
                                                            {item.label}
                                                        </span>
                                                        {item.type === "ERC20" && (
                                                            <span
                                                                data-scope="token"
                                                                data-part="address"
                                                                className="absolute bottom-0 start-0 text-ellipsis overflow-hidden w-full max-w-3/4 opacity-75 text-[0.85em]"
                                                            >
                                                                {item.value}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span data-scope="token" data-part="balance">
                                                        <AvailableAmount
                                                            userAddress={user!.address as Address}
                                                            {...(item.type === "ERC20"
                                                                ? {
                                                                      tokenAddress: item.value as Address,
                                                                  }
                                                                : {})}
                                                        />
                                                    </span>
                                                </Combobox.Gui.ItemText>
                                                <Combobox.Gui.ItemIndicator className="self-center">
                                                    ✓
                                                </Combobox.Gui.ItemIndicator>
                                            </Combobox.Gui.Item>
                                        ))}
                                    </Combobox.Gui.Content>
                                </Combobox.Gui.Positioner>
                            </Combobox.Gui.Root>
                            <Field.Gui.HelperText>
                                The token you'll send. This will default to the native token.
                            </Field.Gui.HelperText>
                            <Field.Gui.ErrorText>
                                Ensure you're sending an existing, valid ERC20 token.
                            </Field.Gui.ErrorText>
                        </Field.Gui.Root>
                    )
                }}
            />
            <form.Field
                name={FieldFormSendAssets.TokenDecimals}
                // biome-ignore lint/correctness/noChildrenProp: tanstack-form API
                children={({ state }) => {
                    return (
                        <input
                            type="number"
                            hidden
                            readOnly
                            name={FieldFormSendAssets.TokenDecimals}
                            id={FieldFormSendAssets.TokenDecimals}
                            value={state.value as number}
                        />
                    )
                }}
            />
            <form.Field
                name={FieldFormSendAssets.Recipient}
                // biome-ignore lint/correctness/noChildrenProp: tanstack-form API
                children={({ state, handleChange }) => {
                    return (
                        <Field.Gui.Root
                            required
                            invalid={state.meta.errors.length > 0 && state.meta.isTouched}
                            readOnly={
                                mutationSendTransaction.status === "pending" || queryWaitForTransactionReceipt.isLoading
                            }
                        >
                            <Field.Gui.Label htmlFor={FieldFormSendAssets.Recipient}>To</Field.Gui.Label>
                            <Field.Gui.Input
                                id={FieldFormSendAssets.Recipient}
                                name={FieldFormSendAssets.Recipient}
                                placeholder="0x..."
                                onChange={(e) => handleChange(e.currentTarget.value)}
                                type="text"
                                pattern="^$|^0x[a-fA-F0-9]{40}$"
                            />
                            <Field.Gui.ErrorText>
                                {state.meta.errors.length > 0 && state.meta.isTouched
                                    ? (state.meta.errors[0] as unknown as { message: string })?.message
                                    : null}
                            </Field.Gui.ErrorText>
                            <Field.Gui.HelperText>The Ethereum address you'll send the tokens to.</Field.Gui.HelperText>
                        </Field.Gui.Root>
                    )
                }}
            />
            <form.Field
                name={FieldFormSendAssets.Amount}
                // biome-ignore lint/correctness/noChildrenProp: tanstack-form API
                children={({ state, handleChange }) => {
                    return (
                        <Field.Gui.Root
                            invalid={
                                (state.meta.errors.length > 0 || state.value > maxTokenAmount.amount) &&
                                state.meta.isTouched &&
                                !state.meta.isValidating
                            }
                            required
                            readOnly={
                                mutationSendTransaction.status === "pending" || queryWaitForTransactionReceipt.isLoading
                            }
                        >
                            <Field.Gui.Label
                                className="inline-flex items-baseline justify-between gap-3"
                                htmlFor={FieldFormSendAssets.Amount}
                            >
                                <span>Amount</span>
                                <span className="text-[0.8em] opacity-75">
                                    Your balance:&nbsp;
                                    <Balance status={maxTokenAmount.status} value={maxTokenAmount.amount} />
                                </span>
                            </Field.Gui.Label>
                            <div className="relative isolate">
                                <Field.Gui.Input
                                    id={FieldFormSendAssets.Amount}
                                    name={FieldFormSendAssets.Amount}
                                    placeholder="98765.4321"
                                    step="any"
                                    inputMode="decimal"
                                    className="!pe-[6.5ch]"
                                    type="number"
                                    min="0"
                                    value={state.value}
                                    //max={maxTokenAmount.amount}
                                    onChange={(e) => handleChange(+e.currentTarget.value)}
                                />
                                <Button.Gui
                                    aria-disabled={maxTokenAmount.status !== "success"}
                                    type="button"
                                    scale="sm"
                                    onClick={() => {
                                        if (
                                            mutationSendTransaction.status === "pending" ||
                                            maxTokenAmount.status !== "success"
                                        )
                                            return
                                        handleChange(maxTokenAmount.amount)
                                    }}
                                    className="absolute font-bold z-1 end-0 top-1/2 -translate-y-1/2"
                                >
                                    Max
                                </Button.Gui>
                            </div>
                            <Field.Gui.ErrorText>
                                {state.meta.errors.length > 0 && !state.meta.isValidating && state.meta.isTouched
                                    ? (state.meta.errors[0] as unknown as { message: string })?.message
                                    : null}
                                {state.value && state.value > maxTokenAmount.amount
                                    ? `Ensure the amount is less or equal to ${maxTokenAmount.amount}.`
                                    : null}
                            </Field.Gui.ErrorText>
                            <Field.Gui.HelperText>
                                The amount of tokens you want to send from your account.
                            </Field.Gui.HelperText>
                        </Field.Gui.Root>
                    )
                }}
            />
        </form>
    )
}

interface AvailableTokenAmountProps {
    tokenAddress?: Address
    userAddress: Address
}
const AvailableAmount = ({ tokenAddress, userAddress }: AvailableTokenAmountProps) => {
    const { balance, queryBalanceNativeToken, queryBalanceERC20Token } = useTokenBalance({
        tokenAddress,
        userAddress,
    })
    if (isAddress(`${tokenAddress}`)) return <Balance status={queryBalanceERC20Token.status} value={balance} />

    return <Balance status={queryBalanceNativeToken.status} value={balance} />
}
