import { Dialog } from "@ark-ui/react/dialog"
import { config } from "@happychain/sdk-shared"
import { CaretLeft as BackIcon, CaretRight as GoToIcon } from "@phosphor-icons/react"
import { useQuery } from "@tanstack/react-query"
import { useAtom, useAtomValue } from "jotai"
import type { FC } from "react"
import { useAccount } from "wagmi"
import { permissionsAtom } from "../../../../state/permissions"
import { userAtom } from "../../../../state/user"
import {
    recipeDialogBody,
    recipeDialogHeaderActionsControls,
    recipeDialogHeadline,
} from "../../../primitives/dialog/variants"
import { recipeContent, recipePositioner } from "../../../primitives/popover/variants"
import { dappPermissionsState } from "../../permissions/DialogDappDetailedPermissions"
import { secondaryMenuState } from "../state"

const KEY_QUERY_GET_ALL_DAPPS_WIHT_PERMISSIONS = "GET_ALL_DAPPS_WITH_PERMISSIONS"

/**
 * List all dapps with permissions
 */
const ListDapps: FC = () => {
    const [, setStateDisplayedPermissions] = useAtom(dappPermissionsState)
    const user = useAtomValue(userAtom)
    const permissionsMap = useAtom(permissionsAtom)[0]
    const account = useAccount()

    const queryDappsWithPermissions = useQuery({
        enabled: !!(user?.address && account?.address),
        queryKey: [KEY_QUERY_GET_ALL_DAPPS_WIHT_PERMISSIONS, account?.address],
        queryFn: () => {
            return permissionsMap[account.address!]
        },
        select(data) {
            if (!data) return
            return Object.entries(data).filter((record) => {
                const [dappUrl, dappPermissions] = record
                return dappUrl !== config.iframePath && Object.keys(dappPermissions).length > 0
            })
        },
    })
    if (queryDappsWithPermissions.status === "error") return <p>Something went wrong</p>
    if (queryDappsWithPermissions.status === "pending") return <>...</>
    return (
        <>
            {(queryDappsWithPermissions?.data?.length ?? 0) > 0 ? (
                <>
                    <ul>
                        {queryDappsWithPermissions.data!.map((record) => {
                            const [dappUrl, permissions] = record
                            return (
                                <li
                                    className="inline-flex w-full p-2 focus-within:bg-base-200 focus-within:[&_svg]:text-accent-content font-medium relative overflow-hidden text-ellipsis items-center gap-2 text-sm"
                                    key={`list-permissions-dapp-${dappUrl}`}
                                >
                                    <img
                                        loading="lazy"
                                        height="16"
                                        width="16"
                                        alt={dappUrl}
                                        src={`https://www.google.com/s2/favicons?domain=${dappUrl}&sz=16`}
                                    />
                                    <span className="me-auto inline-block">{dappUrl}</span>
                                    <GoToIcon />
                                    <button
                                        className="absolute w-full h-full inset-0 z-10 opacity-0"
                                        onClick={() => {
                                            setStateDisplayedPermissions({
                                                selectedDapp: {
                                                    url: dappUrl,
                                                    permissions,
                                                },
                                            })
                                        }}
                                        type="button"
                                    >
                                        Open {dappUrl} permissions list
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </>
            ) : (
                <p className="text-sm italic px-2 text-center py-24 w-10/12 mx-auto text-neutral/50">
                    It seems there aren't any apps you gave permissions to.
                </p>
            )}
        </>
    )
}

/**
 * Displays all dapps with permissions
 */
const DialogAllDappsWithPermissions: FC = () => {
    const [state, setState] = useAtom(secondaryMenuState)

    return (
        <Dialog.Root
            lazyMount
            unmountOnExit
            open={state.visibilityDialogPermissions}
            onOpenChange={(details) =>
                setState({
                    ...state,
                    visibilityDialogPermissions: details.open,
                    visibilityMenu: !details.open,
                })
            }
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
                    <Dialog.Title
                        className={recipeDialogHeadline({
                            continuity: "header",
                            spacing: "tight",
                            scale: "default",
                            label: "default",
                            class: "flex items-center justify-center",
                        })}
                    >
                        Permissions
                    </Dialog.Title>
                    <div
                        className={recipeDialogBody({
                            spacing: "default",
                            class: "grid",
                        })}
                    >
                        <Dialog.Description className="sr-only">
                            Access and change the permissions of all dApps you interacted with.
                        </Dialog.Description>
                        <ListDapps />
                        <Dialog.CloseTrigger
                            className={recipeDialogHeaderActionsControls({
                                layer: "header",
                                alignmentX: "start",
                            })}
                        >
                            <BackIcon />
                            <span className="sr-only">Back to menu</span>
                        </Dialog.CloseTrigger>
                    </div>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}

export { DialogAllDappsWithPermissions, KEY_QUERY_GET_ALL_DAPPS_WIHT_PERMISSIONS }
