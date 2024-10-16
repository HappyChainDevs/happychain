import { Dialog } from "@ark-ui/react/dialog"
import type { HTTPString } from "@happychain/common"
import { atom, useAtom } from "jotai"
import type { FC } from "react"
import { revokePermissions } from "../../../services/permissions"
import type { AppPermissions } from "../../../state/permissions"
import { BackIcon } from "../../primitives/dialog/icons"
import {
    recipeDialogBody,
    recipeDialogHeaderActionsControls,
    recipeDialogHeadline,
} from "../../primitives/dialog/variants"
import { recipeContent, recipePositioner } from "../../primitives/popover/variants"
import { ClearAllPermissions } from "./ClearAllPermissions"
import { ListDappPermissions } from "./ListPermissions"

const dialogDappPermissionsAtom = atom<{
    selectedDapp?: {
        url: string
        permissions: AppPermissions
    }
}>({
    selectedDapp: undefined,
})

/**
 * Displays all the permissions of a given dApp and lets the user revoke said permission(s)
 */
const DialogDappDetailedPermissions: FC = () => {
    const [state, setState] = useAtom(dialogDappPermissionsAtom)
    return (
        <Dialog.Root
            lazyMount
            unmountOnExit
            open={!!state.selectedDapp}
            onInteractOutside={() => {
                setState({
                    selectedDapp: undefined,
                })
            }}
            onEscapeKeyDown={() => {
                setState({
                    selectedDapp: undefined,
                })
            }}
        >
            <Dialog.Positioner
                className={recipePositioner({
                    originY: "bottom",
                    mode: "modal",
                    class: " aria-hidden:[&_[data-part=close-trigger]]:opacity-0",
                })}
            >
                <Dialog.Content
                    className={recipeContent({
                        intent: "default",
                        scale: "default",
                        animation: "modal",
                        class: "max-h-[calc(100%-3rem)] !overflow-hidden",
                    })}
                >
                    <div
                        className={recipeDialogHeadline({
                            continuity: "header",
                            spacing: "tight",
                            scale: "default",
                            label: "default",
                            class: "flex items-center justify-center",
                        })}
                    >
                        <img
                            loading="lazy"
                            alt={state.selectedDapp?.url}
                            height="20"
                            width="20"
                            src={`https://www.google.com/s2/favicons?domain=${state.selectedDapp?.url}&sz=20`}
                        />
                        <Dialog.Title>{state.selectedDapp?.url}</Dialog.Title>
                    </div>
                    <div
                        className={recipeDialogBody({
                            spacing: "default",
                            class: "relative overflow-y-auto",
                        })}
                    >
                        <Dialog.Description className="sr-only">
                            Access and change the permissions of {state.selectedDapp?.url}.
                        </Dialog.Description>
                        {state?.selectedDapp?.permissions ? (
                            <>
                                {Object.keys(state?.selectedDapp?.permissions)?.length === 0 ? (
                                    <p className="text-neutral/50 italic text-xs py-4 text-center">
                                        This app has no permissions enabled.
                                    </p>
                                ) : (
                                    <>
                                        <ListDappPermissions
                                            dappUrl={state.selectedDapp.url as HTTPString}
                                            list={state.selectedDapp.permissions}
                                        />
                                        <ClearAllPermissions
                                            handleClearAllPermissions={() => {
                                                revokePermissions(state.selectedDapp!.permissions as AppPermissions)
                                                setState({
                                                    selectedDapp: undefined,
                                                })
                                            }}
                                        />
                                    </>
                                )}
                            </>
                        ) : (
                            <p className="text-xs text-neutral/50 text-center py-4">No permissions</p>
                        )}
                    </div>
                    <Dialog.CloseTrigger
                        className={recipeDialogHeaderActionsControls({
                            layer: "header",
                            alignmentX: "start",
                        })}
                        onClick={() => {
                            setState({
                                selectedDapp: undefined,
                            })
                        }}
                    >
                        <BackIcon weight="bold" className="text-[1rem]" />
                        <span className="sr-only">Back</span>
                    </Dialog.CloseTrigger>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}

export { DialogDappDetailedPermissions, dialogDappPermissionsAtom }
