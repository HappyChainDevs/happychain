import { Alert, Button, Combobox, Dialog, Switch, createListCollection } from "@happy.tech/uikit-react"
import { Link, useParams } from "@tanstack/react-router"
import { atom, useAtom } from "jotai"
import { type PropsWithChildren, useMemo, useState } from "react"
import { useGetDappPermissions } from "#src/components/interface/permissions/useGetDappPermissions"
import { type PermissionDescriptionIndex, permissionDescriptions } from "#src/constants/requestLabels"
import { useHasPermissions } from "#src/hooks/useHasPermissions"
import { clearAppPermissions, grantPermissions, revokePermissions } from "#src/state/permissions"
import type { AppURL } from "#src/utils/appURL"
import { BottomNavbar, Scrollable } from "#src/v2/layouts/root/screen"

const dialogConfirmClearPermissionsVisibility = atom(false)
const selectedDappPermissions = atom<Array<string>>([])

export const PATHNAME_DAPP_PERMISSIONS = "/embed/permissions/$dappId"

function useDappPermissions() {
    const dappUrl = useParams({
        from: PATHNAME_DAPP_PERMISSIONS,
        select: (params) => decodeURI(params.dappId),
    }) as AppURL
    const listAppPermissions = useGetDappPermissions(dappUrl)
    const confirmClearPermissionsVisibility = useAtom(dialogConfirmClearPermissionsVisibility)
    const [selectedPermissions, _setSelectedPermissions] = useAtom(selectedDappPermissions)
    const [, _setConfirmClearAllVisible] = confirmClearPermissionsVisibility
    const [initialPermissionsList] = useState(Object.keys(listAppPermissions))
    const [permissions, setPermissions] = useState(initialPermissionsList)
    const collectionPermissions = useMemo(() => createListCollection({ items: permissions }), [permissions])

    function handleOnConfirmClearPermissions() {
        clearAppPermissions(dappUrl)
        setPermissions([])
    }
    return {
        dappUrl,
        confirmClearPermissionsVisibility,
        handleOnConfirmClearPermissions,
        permissions: {
            collection: collectionPermissions,
            selected: selectedPermissions,
            initial: initialPermissionsList,
        },
    }
}
export const ScreenAppPermissions = () => {
    const {
        dappUrl,
        permissions,
        confirmClearPermissionsVisibility: [, setConfirmDialogVisible],
    } = useDappPermissions()
    return (
        <>
            <div className="flex justify-between gap-3 pb-2 items-center">
                <h1 className="font-bold">{dappUrl}</h1>
                {permissions.collection.items.length > 0 && (
                    <Button.Gui className="shrink-0" intent="negative" onClick={() => setConfirmDialogVisible(true)}>
                        {permissions.selected.length === permissions.initial.length || permissions.selected.length === 0
                            ? "Clear all"
                            : `Clear (${permissions.selected.length})`}
                    </Button.Gui>
                )}
            </div>
            <Scrollable>
                {permissions.collection.items.length > 0 ? (
                    <Combobox.Gui.Root open placeholder="Filter by name" multiple collection={permissions.collection}>
                        <Combobox.Gui.Control className="sticky flex items-center gap-4 isolate z-1 inset-0 pb-2">
                            <Combobox.Gui.Input className="overflow-hidden text-ellipsis" />
                        </Combobox.Gui.Control>

                        <Combobox.Gui.Content presentation="detached">
                            {permissions.collection.items.map((item) => (
                                <Combobox.Gui.Item
                                    className="first:border-t border-current/10 flex-row-reverse px-0 items-center"
                                    key={`app-${dappUrl}-permission-${item}`}
                                    item={item}
                                >
                                    <Combobox.Gui.ItemText asChild>
                                        <PermissionControl
                                            permissionRequest={item as PermissionDescriptionIndex}
                                            dappUrl={dappUrl as AppURL}
                                        >
                                            {permissionDescriptions?.[item as PermissionDescriptionIndex] ?? "---"}
                                        </PermissionControl>
                                    </Combobox.Gui.ItemText>
                                </Combobox.Gui.Item>
                            ))}
                        </Combobox.Gui.Content>
                    </Combobox.Gui.Root>
                ) : (
                    <p className="flex items-center justify-center text-center">
                        You did not grant any permission to this app.
                    </p>
                )}
            </Scrollable>
        </>
    )
}

function usePermissionControl({ request, dappUrl }: { request: PermissionDescriptionIndex; dappUrl: AppURL }) {
    const hasPermission = useHasPermissions(request, dappUrl)
    function handleOnControlCheckedChange({ checked }: { checked: boolean }) {
        !checked ? revokePermissions(dappUrl, request) : grantPermissions(dappUrl, request)
    }

    return {
        hasPermission,
        handleOnControlCheckedChange,
    }
}

interface PermissionControlProps extends PropsWithChildren {
    permissionRequest: PermissionDescriptionIndex
    dappUrl: AppURL
}
const PermissionControl = ({ children, permissionRequest, dappUrl }: PermissionControlProps) => {
    const { hasPermission, handleOnControlCheckedChange } = usePermissionControl({
        request: permissionRequest,
        dappUrl,
    })
    // @todo - handle session keys
    return (
        <Switch.Gui.Root checked={hasPermission} onCheckedChange={handleOnControlCheckedChange} className="w-full">
            <Switch.Gui.Control>
                <Switch.Gui.Thumb />
            </Switch.Gui.Control>
            <Switch.Gui.Label>{children}</Switch.Gui.Label>
            <Switch.Gui.HiddenInput />
        </Switch.Gui.Root>
    )
}

export const DialogClearPermissions = () => {
    const {
        dappUrl,
        handleOnConfirmClearPermissions,
        confirmClearPermissionsVisibility: [dialogClearAllVisible, setConfirmClearAllDialogVisible],
    } = useDappPermissions()

    return (
        <Dialog.Root
            closeOnInteractOutside={false}
            closeOnEscape={true}
            open={dialogClearAllVisible}
            onOpenChange={(details: { open: boolean | ((prev: boolean) => boolean) }) =>
                setConfirmClearAllDialogVisible(details.open)
            }
        >
            <Dialog.Gui.Backdrop className="bg-hds-system-skeuo-surface-default" />
            <Dialog.Gui.Positioner className="flex overflow-auto absolute inset-0 size-full items-center justify-center">
                <Dialog.Gui.Content className="size-full z-1 pb-2 overflow-hidden bg-hds-system-skeuo-surface-default">
                    <div className="size-full flex flex-col items-center justify-center">
                        <Alert.Gui.Root intent="negative">
                            <Alert.Gui.Icon />
                            <Alert.Gui.Title>
                                Are you sure you want to clear all permissions for <br /> {dappUrl} ?
                            </Alert.Gui.Title>
                        </Alert.Gui.Root>

                        <div className="flex pt-6 gap-2 flex-col">
                            <Dialog.Gui.CloseTrigger
                                onClick={handleOnConfirmClearPermissions}
                                className="justify-center"
                                aspect="outline"
                            >
                                Yes, clear all permissions
                            </Dialog.Gui.CloseTrigger>
                            <Dialog.Gui.CloseTrigger className="justify-center">Go back</Dialog.Gui.CloseTrigger>
                        </div>
                    </div>
                </Dialog.Gui.Content>
            </Dialog.Gui.Positioner>
        </Dialog.Root>
    )
}

export const BottomNavbarAppPermissions = () => {
    return (
        <BottomNavbar asChild>
            <nav>
                <BottomNavbar.Item asChild>
                    <Link to="/embed/permissions" className="gap-2">
                        <span
                            aria-hidden="true"
                            className="h-3.5 block aspect-square mask-icon-hds-system-gui-arrow-left bg-current"
                        />
                        <span>Back</span>
                    </Link>
                </BottomNavbar.Item>
            </nav>
        </BottomNavbar>
    )
}
