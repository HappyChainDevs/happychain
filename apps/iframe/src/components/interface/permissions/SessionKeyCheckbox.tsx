import { Checkbox } from "@ark-ui/react"
import { Check } from "@phosphor-icons/react"
import { useState } from "react"
import type { Address } from "viem"
import { Permissions } from "#src/constants/permissions"
import { type SessionKeyRequest, hasPermissions } from "#src/state/permissions"
import type { AppURL } from "#src/utils/appURL"

interface SessionKeyContractProps {
    appURL: AppURL
    contract: Address
    addActiveSessionKey: (app: AppURL, request: SessionKeyRequest) => void
    removeActiveSessionKey: (app: AppURL, request: SessionKeyRequest) => void
}

export const SessionKeyCheckbox = ({
    appURL,
    contract,
    addActiveSessionKey,
    removeActiveSessionKey,
}: SessionKeyContractProps) => {
    // Initial state is whether the permission is granted or not.
    const permissionRequest = { [Permissions.SessionKey]: { target: contract } }
    const [checked, setChecked] = useState(hasPermissions(appURL, permissionRequest))

    return (
        <Checkbox.Root
            checked={checked}
            className="w-full flex justify-between items-center focus-within:underline py-2 gap-4 cursor-pointer disabled:cursor-not-allowed text-base-content/80 dark:text-neutral-content/80"
            onCheckedChange={(e: { checked: boolean }) => {
                // if user deselects it to un-grant the permission, we store it
                // in the atom to be used in the revokeSessionKey call
                if (e.checked) addActiveSessionKey(appURL, permissionRequest)
                else removeActiveSessionKey(appURL, permissionRequest)
                setChecked(e.checked)
            }}
        >
            <Checkbox.Label className="font-mono block overflow-hidden text-ellipsis">{contract}</Checkbox.Label>
            <Checkbox.Control
                className={
                    "size-5 rounded " +
                    "[&[data-state=checked]_[data-part=indicator]]:text-primary " +
                    "border-2 data-[focus]:bg-neutral-content/10 " +
                    "data-[state=checked]:data-[focus]:bg-primary/5 " +
                    "data-[focus]:border-base-content/30 " +
                    "border-base-content/20 " +
                    "flex items-center justify-center"
                }
            >
                <Checkbox.Indicator className="text-transparent">
                    <Check />
                </Checkbox.Indicator>
            </Checkbox.Control>
            <Checkbox.HiddenInput />
        </Checkbox.Root>
    )
}
