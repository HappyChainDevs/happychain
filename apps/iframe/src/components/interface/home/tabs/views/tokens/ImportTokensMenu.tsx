import { Dialog, Field } from "@ark-ui/react"
import { Plus } from "@phosphor-icons/react"
import { useAtom, useAtomValue } from "jotai"
import { useCallback, useState } from "react"
import { type Address, isAddress } from "viem"
import { useWatchAsset } from "wagmi"
import { Button } from "#src/components/primitives/button/Button"
import { FieldInput } from "#src/components/primitives/input/FieldInput"
import { Input } from "#src/components/primitives/input/Input"
import { recipePositioner } from "#src/components/primitives/popover/variants"
import { useERC20Balance } from "#src/hooks/useERC20Balance"
import { userAtom } from "#src/state/user"
import { importTokensDialogVisibilityAtom } from "./state"

/**
 * Trigger
 */
export const TriggerImportTokensDialog = () => {
    const [isVisible, setVisibility] = useAtom(importTokensDialogVisibilityAtom)

    return (
        <button
            type="button"
            className="flex flex-row items-center justify-center gap-2 hover:text-blue-600 hover:underline"
            onClick={() => {
                setVisibility(!isVisible)
            }}
        >
            <Plus size="1em" />
            <span>Import Tokens</span>
        </button>
    )
}

// 0xc80629fE33747288AaFb97684F86f7eD2D1aBF69

/**
 * Menu
 */
export const ImportTokensDialog = () => {
    const [isImportTokensDialogVisible, setIsImportTokensDialogVisible] = useAtom(importTokensDialogVisibilityAtom)
    const user = useAtomValue(userAtom)

    const [inputAdd, setInputAdd] = useState("")

    const {
        data: { decimals, symbol } = {},
    } = useERC20Balance(inputAdd as Address, user?.address as Address)

    const isEmpty = inputAdd === "" // no inputted address, user has deleted their input
    const isValid = isAddress(inputAdd, { strict: true })
    const invalidAddressInputCondition = isEmpty || isValid

    const { status, watchAssetAsync } = useWatchAsset()

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target
        setInputAdd(value)
    }

    const submitAssetData = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault()

            const formData = new FormData(e.currentTarget)
            const address = formData.get("address") as Address
            const symbol = formData.get("symbol") as string
            const decimals = formData.get("decimals") as string

            if (address && symbol && decimals) {
                // we use the async function so that we can keep the
                // dialog open while the user is approving / rejecting the request
                const watch = await watchAssetAsync({
                    type: "ERC20",
                    options: {
                        address: address,
                        symbol: symbol,
                        decimals: Number(decimals),
                    },
                })

                if (watch && status === "success") setIsImportTokensDialogVisible(false)
            }
        },
        [setIsImportTokensDialogVisible, status, watchAssetAsync],
    )

    return (
        <Dialog.Root
            lazyMount
            unmountOnExit
            onOpenChange={(details) => {
                setIsImportTokensDialogVisible(details.open)
            }}
            open={isImportTokensDialogVisible}
        >
            <Dialog.Positioner
                className={recipePositioner({
                    mode: "modal",
                    originY: "bottom",
                })}
            >
                <Dialog.Content className="text-center overflow-y-auto bg-base-100 p-4 lg:p-5 text-sm text-neutral-11 min-h-fit size-full inset-0 pb-3 sm:pb-0 relative [&[data-state=open]]:flex flex-col motion-safe:[&[data-state=open]]:animate-growIn motion-safe:[&[data-state=closed]]:animate-growOut">
                    <div className="my-auto grid gap-1 items-start">
                        <Dialog.Title className="text-start font-bold text-base-content">Import Token</Dialog.Title>
                        <Dialog.Description className="text-start text-content text-xs">
                            Enter Token Specifications (ERC-20)
                        </Dialog.Description>
                    </div>
                    <form
                        className="flex flex-col w-full h-full items-center justify-center py-2 space-y-4"
                        onSubmit={submitAssetData}
                    >
                        <FieldInput
                            helperLabel="Token Contract Address"
                            errorLabel="Invalid address"
                            invalid={!invalidAddressInputCondition}
                        >
                            <Field.Label className="text-md text-base-content">Address</Field.Label>
                            <Input
                                aria-invalid={!invalidAddressInputCondition}
                                name="address"
                                id="token-address"
                                type="string"
                                onChange={handleInputChange}
                                value={inputAdd}
                                placeholder="0x123..."
                                inputClass="w-full"
                            />
                        </FieldInput>

                        {isValid && (
                            <>
                                <FieldInput helperLabel="Symbol" errorLabel="Symbol not found">
                                    <Field.Label className="text-md text-base-content">Symbol</Field.Label>
                                    <Input
                                        name="symbol"
                                        id="token-symbol"
                                        type="string"
                                        value={symbol}
                                        inputClass="w-full"
                                        readOnly
                                    />
                                </FieldInput>

                                <FieldInput helperLabel="Decimals" errorLabel="Decimals data not found">
                                    <Field.Label className="text-md text-base-content">Decimals</Field.Label>
                                    <Input
                                        name="decimals"
                                        id="token-decimal"
                                        type="string"
                                        value={decimals}
                                        inputClass="w-full"
                                        readOnly
                                    />
                                </FieldInput>

                                <Button
                                    type="submit"
                                    intent="primary"
                                    className="text-neutral-content justify-center"
                                    isLoading={status === "pending"}
                                    disabled={symbol === undefined || decimals === undefined}
                                >
                                    Submit
                                </Button>
                            </>
                        )}
                    </form>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}
