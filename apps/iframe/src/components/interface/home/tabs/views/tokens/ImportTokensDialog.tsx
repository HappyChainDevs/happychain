import { Dialog, Field } from "@ark-ui/react"
import { Plus, X } from "@phosphor-icons/react"
import { useAtom, useAtomValue } from "jotai"
import { useCallback, useEffect, useState } from "react"
import { type Address, isAddress } from "viem"
import { useWatchAsset } from "wagmi"
import { Button } from "#src/components/primitives/button/Button"

import { cx } from "class-variance-authority"
import { FieldInput } from "#src/components/primitives/input/FieldInput"
import { Input } from "#src/components/primitives/input/Input"
import { recipeTextInput } from "#src/components/primitives/input/variants.ts"
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
        [setVisibility, watchAssetAsync],
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
                <Dialog.Content className="text-center overflow-y-auto bg-base-300 p-4 lg:p-5 text-sm text-neutral-11 min-h-fit size-full inset-0 pb-3 sm:pb-0 relative [&[data-state=open]]:flex flex-col motion-safe:[&[data-state=open]]:animate-growIn motion-safe:[&[data-state=closed]]:animate-growOut">
                    <div className="flex flex-row my-auto gap-4 items-start">
                        <div className="flex flex-col w-full items-start justify-start">
                            <Dialog.Title className="text-start font-semibold text-base-content">
                                Import ERC-20 Token
                            </Dialog.Title>
                        </div>

                        <Dialog.CloseTrigger>
                            <X size={"1.25em"} />
                        </Dialog.CloseTrigger>
                    </div>
                    <form
                        className="flex flex-col w-full h-full items-center justify-center py-2 space-y-4"
                        onSubmit={submitWatchAssetData}
                    >
                        <FieldInput errorLabel="Invalid Address" invalid={!isEmpty && !isValidAddress}>
                            <Field.Label className="text-md text-base-content">Address</Field.Label>
                            <Input
                                scale={"default"}
                                aria-invalid={!isEmpty && !isValidAddress}
                                name="address"
                                id="token-address"
                                type="string"
                                onChange={handleAddressInputChange}
                                value={inputAddress}
                                placeholder="0x123..."
                                inputClass="w-full"
                            />
                        </FieldInput>

                        <FieldInput
                            errorLabel="Invalid Token Contract"
                            invalid={symbolInputInvalidCondition}
                            isLoading={isRefetching || isLoading}
                        >
                            <Field.Label className="text-md text-base-content">Token Symbol</Field.Label>
                            <Input
                                name="symbol"
                                id="token-symbol"
                                type="string"
                                value={customTokenSymbol}
                                inputClass="w-full"
                                scale={"default"}
                                onChange={handleCustomSymbolInputChange}
                                disabled={!isValidAddress || symbolInputInvalidCondition}
                                readOnly={symbolInputReadOnly}
                            />
                        </FieldInput>

                        {/*
                         * `Decimals` field value behavior:
                         * - Empty if no valid address is entered
                         * - Shows decimals from contract if available
                         * - Defaults to "18" if contract read fails (most tokens use 18 decimals)
                         */}
                        <FieldInput
                            errorLabel="Invalid Token Contract"
                            invalid={decimalsInputInvalidCondition}
                            isLoading={isRefetching || isLoading}
                        >
                            <Field.Label className="text-md text-base-content disabled:opacity-50">
                                Token Decimals
                            </Field.Label>
                            <textarea
                                id="token-decimal"
                                name="decimals"
                                readOnly
                                className={cx(
                                    "h-[40px] !appearance-none caret-transparent resize-none border focus:ring-0",
                                    !isValidAddress && "opacity-20 cursor-not-allowed",
                                    `${recipeTextInput({ scale: "default" })}`,
                                )}
                                disabled={!isValidAddress || decimalsInputInvalidCondition}
                                defaultValue={!isValidAddress ? "" : decimals !== undefined ? decimals : ""}
                            />
                        </FieldInput>

                        <Button
                            type="submit"
                            intent={"primary"}
                            className="text-neutral-content justify-center"
                            isLoading={status === "pending"}
                            disabled={submitButtonDisabledCondition}
                        >
                            Submit
                        </Button>
                    </form>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}
