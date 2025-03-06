import { Dialog } from "@ark-ui/react"
import { Plus } from "@phosphor-icons/react"
import { cx } from "class-variance-authority"
import { useAtom, useAtomValue } from "jotai"
import { useCallback, useEffect, useState } from "react"
import { type Address, isAddress } from "viem"
import { useWatchAsset } from "wagmi"
import { Button, recipeButton } from "#src/components/primitives/button/Button"
import { FormField } from "#src/components/primitives/form-field/FormField.tsx"
import { recipePositioner } from "#src/components/primitives/popover/variants"
import { useERC20Balance } from "#src/hooks/useERC20Balance"
import { importTokensDialogVisibilityAtom } from "#src/state/interfaceState"
import { userAtom } from "#src/state/user"

export const TriggerImportTokensDialog = () => {
    const [isVisible, setVisibility] = useAtom(importTokensDialogVisibilityAtom)

    return (
        <button
            type="button"
            className="flex flex-row items-center justify-center gap-2 hover:underline"
            aria-label={"Open Import Tokens Dialog"}
            onClick={() => {
                setVisibility(!isVisible)
            }}
        >
            <Plus size="0.875em" />
            <span className="text-sm">Import Tokens</span>
        </button>
    )
}

export const ImportTokensDialog = () => {
    const [isVisible, setVisibility] = useAtom(importTokensDialogVisibilityAtom)
    const user = useAtomValue(userAtom)

    const [inputAddress, setInputAddress] = useState("")
    // optional fields, used only if contract reads fail
    const [customTokenSymbol, setCustomTokenSymbol] = useState("")

    const { watchAssetAsync, status } = useWatchAsset()

    const {
        data: { decimals, symbol } = {},
        isRefetching,
        isLoading,
    } = useERC20Balance(inputAddress as Address, user?.address as Address, false)

    // --- conditions for elements being disabled / readOnly ---

    // Check if address is valid
    const isEmpty = inputAddress === ""
    const isValidAddress = isAddress(inputAddress)

    // Show error and allow manual entry if we have a valid address but no contract data
    const symbolInputInvalidCondition = !isLoading && isValidAddress && symbol === undefined && customTokenSymbol === ""
    const decimalsInputInvalidCondition = !isLoading && isValidAddress && decimals === undefined

    // Fields should be readonly (uneditable) iff there's no data fetched from the contract
    // indicating that the entered contract address is not a valid token contract
    const symbolInputReadOnly = symbol === undefined

    // Button should be disabled if:
    // 1. Address is invalid OR
    // 2. We don't have either contract data or user input for both symbol and decimals
    const submitButtonDisabledCondition =
        !isValidAddress || (symbol === undefined && customTokenSymbol === "") || decimals === undefined

    // Input field change handlers
    const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target
        setInputAddress(value)
    }

    const handleCustomSymbolInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target
        setCustomTokenSymbol(value)
    }

    // When symbol from contract changes, update the customTokenSymbol
    useEffect(() => {
        if (symbol) {
            setCustomTokenSymbol(symbol)
        }

        if (inputAddress === "" || !isValidAddress) {
            setCustomTokenSymbol("")
        }
    }, [inputAddress, symbol, isValidAddress])

    const submitWatchAssetData = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault()
            if (status === "pending") return
            const formData = new FormData(e.currentTarget)
            const address = formData.get("address") as Address
            const symbol = formData.get("symbol") as string
            const decimals = formData.get("decimals") as string

            if (address && symbol && decimals) {
                try {
                    await watchAssetAsync({
                        type: "ERC20",
                        options: {
                            address: address,
                            symbol: symbol,
                            decimals: Number(decimals),
                        },
                    })
                    // clear fields and close dialog
                    setInputAddress("")
                    setCustomTokenSymbol("")
                    setVisibility(false)
                } catch (error) {
                    console.error("Error adding token:", error)
                }
            }
        },
        [setVisibility, watchAssetAsync, status],
    )

    return (
        <Dialog.Root
            lazyMount
            unmountOnExit
            onOpenChange={(details) => {
                setVisibility(details.open)
                if (!details.open) {
                    setInputAddress("")
                    setCustomTokenSymbol("")
                }
            }}
            open={isVisible}
        >
            <Dialog.Positioner
                className={recipePositioner({
                    mode: "modal",
                    originY: "bottom",
                })}
            >
                <Dialog.Content
                    className={cx(
                        "overflow-y-auto min-h-fit size-full",
                        "px-2 py-4 sm:pb-0",
                        "text-center text-sm text-neutral-11",
                        "bg-base-200 inset-0 relative",
                        "[&[data-state=open]]:flex flex-col",
                        "motion-safe:[&[data-state=open]]:animate-growIn",
                        "motion-safe:[&[data-state=closed]]:animate-growOut",
                    )}
                >
                    <div className="w-full flex flex-col gap-4 max-w-prose mx-auto">
                        <Dialog.Title className="text-start font-semibold text-base-content">
                            Import ERC-20 token
                        </Dialog.Title>

                        <form className="w-full grid gap-4" onSubmit={submitWatchAssetData}>
                            <FormField.Root
                                readOnly={status === "pending"}
                                required
                                invalid={!isEmpty && !isValidAddress}
                            >
                                <FormField.Label>Address</FormField.Label>
                                <FormField.Input
                                    name="address"
                                    onChange={handleAddressInputChange}
                                    value={inputAddress}
                                    pattern="^$|^0x[a-fA-F0-9]{40}$"
                                    placeholder="0x123..."
                                />
                                <FormField.ErrorText>Invalid contract address.</FormField.ErrorText>
                            </FormField.Root>

                            <FormField.Root
                                required
                                invalid={symbolInputInvalidCondition}
                                readOnly={
                                    symbolInputReadOnly ||
                                    isValidAddress ||
                                    symbolInputInvalidCondition ||
                                    status === "pending"
                                }
                            >
                                <FormField.Label>Token symbol</FormField.Label>
                                <FormField.Input
                                    name="symbol"
                                    type="text"
                                    value={customTokenSymbol}
                                    onChange={handleCustomSymbolInputChange}
                                />

                                <FormField.ErrorText>Invalid token contract.</FormField.ErrorText>
                            </FormField.Root>

                            {/*
                             * `Decimals` field value behavior:
                             * - Empty if no valid address is entered
                             * - Shows decimals from contract if available
                             * - Defaults to "18" if contract read fails (most tokens use 18 decimals)
                             */}
                            <FormField.Root
                                required
                                invalid={decimalsInputInvalidCondition}
                                readOnly={
                                    !isValidAddress ||
                                    decimalsInputInvalidCondition ||
                                    isRefetching ||
                                    isLoading ||
                                    status === "pending"
                                }
                            >
                                <FormField.Label className="text-md text-base-content disabled:opacity-50">
                                    Token decimals
                                </FormField.Label>
                                <FormField.Input name="decimals" type="number" step="1" min="1" />
                                <FormField.ErrorText>
                                    {!isValidAddress
                                        ? "Ensure the token contract address is valid first."
                                        : "Invalid decimal amount."}
                                </FormField.ErrorText>
                            </FormField.Root>

                            <Button
                                type="submit"
                                intent="primary"
                                className="justify-center"
                                isLoading={status === "pending"}
                                aria-disabled={submitButtonDisabledCondition || status === "pending"}
                            >
                                Submit
                            </Button>
                        </form>
                        <Dialog.CloseTrigger
                            className={recipeButton({ intent: "ghost-negative", class: "justify-center" })}
                        >
                            Go back
                        </Dialog.CloseTrigger>
                    </div>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}
