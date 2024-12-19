import { Dialog, Field } from "@ark-ui/react"
import { Plus } from "@phosphor-icons/react"
import { useAtom, useAtomValue } from "jotai"
import { useState } from "react"
import { type Address, isAddress } from "viem"
// import { useWatchAsset } from "wagmi"
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
export const TriggerImportTokensMenu = () => {
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

/**
 * Menu
 */
export const ImportTokensDialog = () => {
    const [isImportTokensDialogVisible, setIsImportTokensDialogVisible] = useAtom(importTokensDialogVisibilityAtom)
    const user = useAtomValue(userAtom)

    const [inputAdd, setInputAdd] = useState("")

    const invalidAddressInputCondition = isAddress(inputAdd) === false

    console.log({ invalidAddressInputCondition })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target
        setInputAdd(value)
    }

    const {
        data: { decimals, symbol } = {},
    } = useERC20Balance(inputAdd as Address, user?.address as Address)

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
                <Dialog.Content className="text-center bg-base-100 p-4 lg:p-5 text-sm text-neutral-11 min-h-fit size-full inset-0 pb-3 sm:pb-0 relative [&[data-state=open]]:flex flex-col motion-safe:[&[data-state=open]]:animate-growIn motion-safe:[&[data-state=closed]]:animate-growOut">
                    <div className="my-auto grid gap-1 items-start">
                        <Dialog.Title className="text-start font-bold text-base-content">Import Token</Dialog.Title>
                        <Dialog.Description className="text-start text-content text-xs">
                            Enter Token Specifications (ERC-20)
                        </Dialog.Description>
                    </div>
                    <form className="flex flex-col w-full h-full items-center justify-center py-2">
                        <FieldInput
                            helperLabel="Token Contract Address"
                            errorLabel="Invalid address"
                            invalid={invalidAddressInputCondition}
                        >
                            <Field.Label>Address</Field.Label>
                            <Input
                                className="bg-slate-300 opacity-50 text-[20px] px-2 w-full text-slate-600 box-border placeholder:text-[20px] placeholder:text-slate-600"
                                readOnly={false}
                                aria-invalid={invalidAddressInputCondition}
                                name="address"
                                id="import-token-address"
                                type="string"
                                onChange={handleInputChange}
                                value={inputAdd}
                            />
                        </FieldInput>
                        {isAddress(inputAdd) && (
                            <>
                                <FieldInput
                                    helperLabel="Symbol"
                                    errorLabel="Invalid address"
                                    invalid={invalidAddressInputCondition}
                                >
                                    <Field.Label>Symbol</Field.Label>
                                    <Input
                                        className="bg-slate-300 opacity-50 text-[20px] px-2 w-full text-slate-600 box-border placeholder:text-[20px] placeholder:text-slate-600"
                                        readOnly={true}
                                        name="symbol"
                                        id="import-token-symbol"
                                        type="string"
                                        onChange={handleInputChange}
                                        value={symbol}
                                    />
                                </FieldInput>
                                <FieldInput
                                    helperLabel="Decimals"
                                    errorLabel="Invalid address"
                                    invalid={invalidAddressInputCondition}
                                >
                                    <Field.Label>Decimals</Field.Label>
                                    <Input
                                        className="bg-slate-300 opacity-50 text-[20px] px-2 w-full text-slate-600 box-border placeholder:text-[20px] placeholder:text-slate-600"
                                        readOnly={true}
                                        name="decimals"
                                        id="import-token-decimal"
                                        type="string"
                                        onChange={handleInputChange}
                                        value={decimals}
                                    />
                                </FieldInput>
                                <Button>submit</Button> {/* todo */}
                            </>
                        )}
                    </form>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}
