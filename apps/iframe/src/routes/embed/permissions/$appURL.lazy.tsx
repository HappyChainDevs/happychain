import { createLazyFileRoute, useParams } from "@tanstack/react-router"
import { ClearSingleAppPermissions } from "#src/components/interface/permissions/ClearSingleAppPermissions"
import { ListSingleAppPermissions } from "#src/components/interface/permissions/ListSingleAppPermissions"
import { Button } from "#src/components/primitives/button/Button"
import { useCachedPermissions } from "#src/hooks/useCachedPermissions"
import {
    PermissionsContext,
    createLocalPermissionsValue,
    useLocalPermissionChanges,
} from "#src/hooks/useLocalPermissionChanges"
import type { AppURL } from "#src/utils/appURL"

export const Route = createLazyFileRoute("/embed/permissions/$appURL")({
    component: DappPermissions,
})

function DappPermissions() {
    const appURL = useParams({
        from: "/embed/permissions/$appURL",
        select: (params) => decodeURI(params.appURL),
    }) as AppURL

    const value = createLocalPermissionsValue(appURL)

    return (
        <PermissionsContext value={value}>
            <DappPermissionsPage appURL={appURL} />
        </PermissionsContext>
    )
}

function DappPermissionsPage({ appURL }: { appURL: AppURL }) {
    const { permissions } = useCachedPermissions(appURL)
    const { save } = useLocalPermissionChanges()
    return (
        <div className="pb-14 overflow-x-hidden">
            <div className="animate-appear flex flex-col min-h-full">
                <h2 className="sticky top-0 text-center bg-base-200 text-base-content font-bold p-1 text-sm">
                    {appURL}
                </h2>
                <p className="sr-only">Access and change the permissions of all dApps you interacted with.</p>

                <ListSingleAppPermissions appURL={appURL} items={permissions} />

                {/* If there are no permissions, we don't show the clear button */}
                {Object.keys(permissions).length > 0 && <ClearSingleAppPermissions url={appURL} />}

                <div className="grow flex items-end justify-center p-4">
                    <Button onClick={() => save.mutate()} disabled={false}>
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    )
}
