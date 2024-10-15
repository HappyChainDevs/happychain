import { Collapsible, useCollapsible } from "@ark-ui/react"
import { Dialog } from "@ark-ui/react/dialog"
import type { HTTPString } from "@happychain/common"
import { cx } from "class-variance-authority"
import { atom, useAtom } from "jotai"
import type { FC } from "react"
import { useHasPermissions } from "../../../hooks/useHasPermissions"
import { grantPermissions, revokePermissions } from "../../../services/permissions"
import type { AppPermissions } from "../../../state/permissions"
import { queryClient } from "../../../tanstack-query/config"
import { Button, recipeButton } from "../../primitives/button/Button"
import { BackIcon } from "../../primitives/dialog/icons"
import {
    recipeDialogBody,
    recipeDialogHeaderActionsControls,
    recipeDialogHeadline,
} from "../../primitives/dialog/variants"
import { recipeContent, recipePositioner } from "../../primitives/popover/variants"
import { Switch } from "../../primitives/toggle-switch/Switch"
import { KEY_QUERY_GET_ALL_DAPPS_WIHT_PERMISSIONS } from "../menu-secondary-actions/dapps-permissions/DialogAllDappsWithPermissions"

const dappPermissionsState = atom<{
    selectedDapp?: {
        url: string
        permissions: AppPermissions
    }
}>({
    selectedDapp: undefined,
})

const DICTIONARIES_PERMISSIONS_MEANING = {
    eth_accounts: "Can recognize you by the Ethereum address you're currently using",
}
type Permission = keyof typeof DICTIONARIES_PERMISSIONS_MEANING

interface DappPermissionProps {
    permission: Permission
    dappUrl: HTTPString
}
/**
 * Allow user to toggle permission on/off
 */
const DappPermission: FC<DappPermissionProps> = (props) => {
    const { permission, dappUrl } = props
    const hasPermission = useHasPermissions(permission)
    return (
        <>
            <Switch
                checked={hasPermission}
                onCheckedChange={(e) => {
                    e.checked === false
                        ? revokePermissions(permission)
                        : grantPermissions(permission, {
                              origin: dappUrl,
                          })
                    queryClient.invalidateQueries({ queryKey: [KEY_QUERY_GET_ALL_DAPPS_WIHT_PERMISSIONS] })
                }}
                className="justify-between w-full [&_[data-part=label]]:w-3/4 flex-row-reverse"
                switchLabel={DICTIONARIES_PERMISSIONS_MEANING[permission]}
            />
        </>
    )
}
/**
 * Displays all the permissions of a given dApp and lets the user revoke said permission(s)
 */
const DialogDappDetailedPermissions: FC = () => {
    const [state, setState] = useAtom(dappPermissionsState)
    const collapsibleClearPermissions = useCollapsible()
    return (
        <Dialog.Root
            lazyMount
            unmountOnExit
            open={!!state.selectedDapp}
            onInteractOutside={() =>
                setState({
                    selectedDapp: undefined,
                })
            }
            onEscapeKeyDown={() =>
                setState({
                    selectedDapp: undefined,
                })
            }
            onOpenChange={(details) => {
                if (!details.open) collapsibleClearPermissions.setOpen(false)
            }}
        >
            <Dialog.Positioner
                className={recipePositioner({
                    originY: "bottom",
                    mode: "modal",
                    class: "aria-hidden:[&_[data-part=close-trigger]]:opacity-0",
                })}
            >
                <Dialog.Content
                    className={recipeContent({
                        intent: "default",
                        scale: "default",
                        animation: "modal",
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
                        data-part="additional-actions"
                        className={recipeDialogBody({
                            spacing: "default",
                            class: "relative",
                        })}
                    >
                        <Dialog.Description className="sr-only">
                            Access and change the permissions of {state.selectedDapp?.url}.
                        </Dialog.Description>

                        {state?.selectedDapp?.permissions && (
                            <ul className="divide-y divide-neutral/10">
                                {Object.keys(state?.selectedDapp?.permissions).map((permission) => {
                                    return (
                                        <li
                                            className="text-xs w-full items-center inline-flex gap-4 justify-between p-2"
                                            key={`edit-permission-${permission}-${state.selectedDapp?.url}`}
                                        >
                                            <DappPermission
                                                dappUrl={state?.selectedDapp?.url as HTTPString}
                                                permission={permission as Permission}
                                            />
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                        <Collapsible.RootProvider value={collapsibleClearPermissions}>
                            <div
                                className={`${collapsibleClearPermissions.visible ? "rounded-t-3xl pt-4" : "rounded-t-none"} fixed flex flex-col bottom-0 start-0 min-h-12 w-full border-t border-neutral/10`}
                            >
                                <Collapsible.Trigger
                                    className={cx(
                                        "text-xs grow w-full justify-center",
                                        collapsibleClearPermissions.visible
                                            ? "font-bold text-base-content"
                                            : recipeButton({
                                                  intent: "ghost-negative",
                                                  class: "focus:!bg-transparent",
                                              }),
                                    )}
                                >
                                    Clear all permissions
                                </Collapsible.Trigger>

                                <Collapsible.Content>
                                    <div className="px-2 pb-6 pt-8 grid gap-4 mx-auto max-w-sm">
                                        <p className="text-neutral text-center text-xs">
                                            Are you sure you want to clear all permissions for this app ?
                                        </p>
                                        <div className="grid gap-2">
                                            <Button className="justify-center" intent="outline-negative">
                                                Yes, clear all permissions
                                            </Button>
                                            <Collapsible.Trigger
                                                className={recipeButton({
                                                    intent: "ghost",
                                                    class: "opacity-75 justify-center",
                                                })}
                                            >
                                                Go back
                                            </Collapsible.Trigger>
                                        </div>
                                    </div>
                                </Collapsible.Content>
                            </div>
                        </Collapsible.RootProvider>
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
                        <BackIcon />
                        <span className="sr-only">Back</span>
                    </Dialog.CloseTrigger>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}

export { DialogDappDetailedPermissions, dappPermissionsState }
