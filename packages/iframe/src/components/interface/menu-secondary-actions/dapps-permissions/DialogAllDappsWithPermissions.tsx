import { Dialog } from "@ark-ui/react/dialog"
import { config } from "@happychain/sdk-shared"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { useAtom, useAtomValue } from "jotai"
import type { FC } from "react"
import { useAccount } from "wagmi"
import { revokePermissions } from "../../../../services/permissions"
import { type AppPermissions, permissionsAtom } from "../../../../state/permissions"
import { userAtom } from "../../../../state/user"
import { BackIcon, GoToIcon } from "../../../primitives/dialog/icons"
import {
    recipeDialogBody,
    recipeDialogHeaderActionsControls,
    recipeDialogHeadline,
} from "../../../primitives/dialog/variants"
import { recipeContent, recipePositioner } from "../../../primitives/popover/variants"
import { dialogDappPermissionsAtom } from "../../permissions/DialogDappDetailedPermissions"
import { secondaryMenuState } from "../state"
import { ClearAllDappsPermissions } from "./ClearAllDappsPermissions"

const KEY_QUERY_GET_ALL_DAPPS_WIHT_PERMISSIONS = "GET_ALL_DAPPS_WITH_PERMISSIONS"

interface ListDappsProps {
    query: UseQueryResult<[string, AppPermissions][] | undefined, Error>
}
/**
 * Fetch and display all dapps with 1 or more permissions
 */
const ListDapps: FC<ListDappsProps> = (props) => {
    const { query } = props
    const [, setStateDisplayedPermissions] = useAtom(dialogDappPermissionsAtom)

    if (query.status === "error") return <p>Something went wrong</p>
    if (query.status === "pending") return <>...</>
    return (
        <div data-part="wrapper">
            {(query?.data?.length ?? 0) > 0 ? (
                <>
                    <ul>
                        {query.data!.map((record) => {
                            const [dappUrl, permissions] = record
                            return (
                                <li
                                    className="inline-flex w-full p-2 min-h-10 focus-within:bg-base-200 focus-within:[&_svg]:text-accent-content font-medium relative overflow-hidden text-ellipsis items-center gap-2 text-sm"
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
        </div>
    )
}

/**
 * Displays all dapps with permissions and let user open dapp detailed permission view
 */
const DialogAllDappsWithPermissions: FC = () => {
    const [state, setState] = useAtom(secondaryMenuState)
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
                        class: "max-h-[calc(100%-3rem)] !overflow-hidden",
                    })}
                >
                    <Dialog.Title
                        className={recipeDialogHeadline({
                            continuity: "header",
                            spacing: "tight",
                            scale: "default",
                            label: "default",
                            class: "flex motion-safe:animate-slideDown items-center justify-center",
                        })}
                    >
                        Permissions
                    </Dialog.Title>
                    <div
                        className={recipeDialogBody({
                            spacing: "default",
                            class: "grid relative overflow-y-auto",
                        })}
                    >
                        <Dialog.Description className="sr-only">
                            Access and change the permissions of all dApps you interacted with.
                        </Dialog.Description>
                        <ListDapps query={queryDappsWithPermissions} />
                        <ClearAllDappsPermissions
                            handleClearAllDappsPermissions={() => {
                                queryDappsWithPermissions.data?.forEach((record) => {
                                    const [, dappPermissions] = record

                                    revokePermissions(dappPermissions)
                                })
                            }}
                        />

                        <Dialog.CloseTrigger
                            className={recipeDialogHeaderActionsControls({
                                layer: "header",
                                alignmentX: "start",
                            })}
                        >
                            <BackIcon weight="bold" className="text-[1rem]" />
                            <span className="sr-only">Back to menu</span>
                        </Dialog.CloseTrigger>
                    </div>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}

export { DialogAllDappsWithPermissions, KEY_QUERY_GET_ALL_DAPPS_WIHT_PERMISSIONS }
