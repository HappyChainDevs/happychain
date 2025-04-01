import { Alert, Button, Combobox, Dialog, createListCollection } from "@happy.tech/uikit-react"
import { Link } from "@tanstack/react-router"
import { atom, useAtom } from "jotai"
import { useMemo, useState } from "react"
import { useGetAllDappsWithPermissions } from "#src/components/interface/permissions/useGetAllDappsWithPermissions"
import { clearAppPermissions } from "#src/state/permissions"
import { type AppURL, getAppURL } from "#src/utils/appURL"
import { BottomNavbar, Scrollable } from "#src/v2/layouts/root/screen"

const dialogConfirmClearAppsWithPermissionsVisibility = atom(false)
const selectedApps = atom<Array<AppURL>>([])

export const PATHNAME_DAPPS_WITH_PERMISSIONS = "/embed/permissions/"

function useDappsWithPermissions() {
    const listDappsWithPermissions = useGetAllDappsWithPermissions()
    const confirmClearAppsWithPermissionsVisibility = useAtom(dialogConfirmClearAppsWithPermissionsVisibility)
    const [selectedDapps, setSelectedDapps] = useAtom(selectedApps)
    const [, setConfirmClearVisible] = confirmClearAppsWithPermissionsVisibility
    const [initialDappsList] = useState([
        getAppURL(),
        ...listDappsWithPermissions
            .filter((record) => {
                return record[0] !== getAppURL()
            })
            .map((record) => {
                const [dappUrl] = record
                return dappUrl
            }),
    ])
    const [dapps, setDapps] = useState(initialDappsList)
    const collectionDapps = useMemo(() => {
        return createListCollection({ items: dapps })
    }, [dapps])

    const handleDappsComboboxInputChange = (details: { inputValue: string }) => {
        const updatedList = initialDappsList.filter((item) =>
            item.toLowerCase().includes(details.inputValue.toLowerCase()),
        )
        setDapps(updatedList.length === 0 ? initialDappsList : updatedList)
    }

    const handleDappsComboboxValueChange = ({ items }: { items: Array<AppURL> }) => {
        setSelectedDapps(items)
    }

    async function handleOnConfirmClearDappsSelection() {
        const selection = selectedDapps.length === 0 ? initialDappsList : selectedDapps
        // Clear selected dapps permissions
        selection.forEach((record) => {
            const url = record
            clearAppPermissions(url as AppURL)
        })
        setDapps(dapps.filter((dapp) => !selection.includes(dapp)))
        setSelectedDapps([])
        setConfirmClearVisible(false)
    }

    return {
        dapps: {
            collection: collectionDapps,
            selected: selectedDapps,
            initial: initialDappsList,
        },
        confirmClearAppsWithPermissionsVisibility,
        handleOnConfirmClearDappsSelection,
        handleDappsComboboxValueChange,
        handleDappsComboboxInputChange,
        setSelectedDapps,
    }
}

export const ScreenPermissions = () => {
    const {
        confirmClearAppsWithPermissionsVisibility: [, setConfirmDialogVisible],
        dapps,
        handleDappsComboboxInputChange,
        handleDappsComboboxValueChange,
    } = useDappsWithPermissions()

    return (
        <>
            <div className="flex justify-between gap-3 pb-2 items-center">
                <h1 className="font-bold">Permissions</h1>
                {dapps.collection.items.length > 0 && (
                    <Button.Gui intent="negative" onClick={() => setConfirmDialogVisible(true)}>
                        {dapps.selected.length === dapps.initial.length || dapps.selected.length === 0
                            ? "Clear all"
                            : `Clear (${dapps.selected.length})`}
                    </Button.Gui>
                )}
            </div>
            <Scrollable>
                {dapps.collection.items.length > 0 ? (
                    <Combobox.Gui.Root
                        open
                        placeholder="Filter by URLs"
                        multiple
                        onValueChange={handleDappsComboboxValueChange}
                        onInputValueChange={handleDappsComboboxInputChange}
                        collection={dapps.collection}
                    >
                        <Combobox.Gui.Label className="sr-only">Apps with permissions</Combobox.Gui.Label>
                        <Combobox.Gui.Control className="sticky bg-hds-system-gui-surface-default flex items-center gap-4 isolate z-1 inset-0 pb-2">
                            <button
                                onClick={() =>
                                    handleDappsComboboxValueChange({
                                        items: dapps.selected.length < dapps.initial.length ? dapps.initial : [],
                                    })
                                }
                                type="button"
                                title={
                                    dapps.selected.length < dapps.initial.length && dapps.selected.length > 0
                                        ? "Select all dapps"
                                        : "Clear dapps selection"
                                }
                                className="shrink-0 cursor-pointer flex relative items-center justify-center self-center size-5 border border-current/50"
                            >
                                <span className="sr-only">Check all dapps</span>
                                {dapps.selected.length === dapps.initial.length && <span aria-hidden="true">-</span>}
                            </button>

                            <Combobox.Gui.Input className="overflow-hidden text-ellipsis" />
                        </Combobox.Gui.Control>

                        <Combobox.Gui.Content presentation="detached">
                            {dapps.collection.items.map((item) => (
                                <Combobox.Gui.Item
                                    className="first:border-t border-current/10 flex-row-reverse px-0 items-center"
                                    key={`app-${item}`}
                                    item={item}
                                >
                                    <Combobox.Gui.ItemText asChild className="p-1 w-full">
                                        <Link
                                            to={`${PATHNAME_DAPPS_WITH_PERMISSIONS}$dappId`}
                                            params={{ dappId: encodeURI(item) }}
                                        >
                                            {item}
                                        </Link>
                                    </Combobox.Gui.ItemText>
                                    <div
                                        aria-hidden="true"
                                        data-state={
                                            dapps.selected.includes(item) || dapps.selected.length === 0
                                                ? "checked"
                                                : "unchecked"
                                        }
                                        data-scope="combobox"
                                        data-part="item-indicator"
                                        className="shrink-0 flex relative items-center justify-center self-center size-5 border border-current/75"
                                    >
                                        {dapps.selected.includes(item) && "✓"}
                                    </div>
                                </Combobox.Gui.Item>
                            ))}
                        </Combobox.Gui.Content>
                    </Combobox.Gui.Root>
                ) : (
                    <p className="flex items-center justify-center text-center">
                        It seems there aren't any apps you gave permissions to.
                    </p>
                )}
            </Scrollable>
        </>
    )
}

export const DialogClearDappsWithPermissions = () => {
    const {
        confirmClearAppsWithPermissionsVisibility: [dialogClearAllVisible, setConfirmDialogVisible],
        handleOnConfirmClearDappsSelection,
        dapps,
    } = useDappsWithPermissions()

    return (
        <Dialog.Root
            closeOnInteractOutside={false}
            closeOnEscape={true}
            open={dialogClearAllVisible}
            onOpenChange={(details: { open: boolean | ((prev: boolean) => boolean) }) =>
                setConfirmDialogVisible(details.open)
            }
        >
            <Dialog.Gui.Backdrop className="bg-hds-system-skeuo-surface-default" />
            <Dialog.Gui.Positioner className="flex overflow-auto absolute inset-0 size-full items-center justify-center">
                <Dialog.Gui.Content className="size-full z-1 pb-2 overflow-hidden bg-hds-system-skeuo-surface-default">
                    <div className="size-full flex flex-col items-center justify-center">
                        <Alert.Gui.Root intent="negative">
                            <Alert.Gui.Icon />
                            <Alert.Gui.Title>
                                Are you sure you want to clear the permissions of the following apps ?
                            </Alert.Gui.Title>
                            <ul className="px-2 pb-2 -mt-2 max-h-[12ex] overflow-auto">
                                {dapps.selected.map((dapp) => (
                                    <li key={`dapp-${dapp}`}>{dapp}</li>
                                ))}
                            </ul>
                        </Alert.Gui.Root>

                        <div className="flex pt-3 gap-2 flex-col">
                            <Dialog.Gui.CloseTrigger
                                onClick={handleOnConfirmClearDappsSelection}
                                className="justify-center"
                                aspect="outline"
                            >
                                Yes, clear selection
                            </Dialog.Gui.CloseTrigger>
                            <Dialog.Gui.CloseTrigger className="justify-center">Go back</Dialog.Gui.CloseTrigger>
                        </div>
                    </div>
                </Dialog.Gui.Content>
            </Dialog.Gui.Positioner>
        </Dialog.Root>
    )
}

export const BottomNavbarPermissions = () => {
    return (
        <BottomNavbar asChild>
            <nav>
                <BottomNavbar.Item asChild>
                    <Link to="/embed" className="gap-2">
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
