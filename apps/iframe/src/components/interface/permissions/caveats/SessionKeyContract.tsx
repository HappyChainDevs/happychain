import { Checkbox } from "@ark-ui/react"
import { PermissionNames } from "@happy.tech/common"
import { Check } from "@phosphor-icons/react"
import { useAtom } from "jotai"
import { useEffect, useState } from "react"
import type { Address } from "viem"
import { targetContractsAtom } from "#src/state/interfaceState"
import { hasPermissions } from "#src/state/permissions.ts"
import type { AppURL } from "#src/utils/appURL"

interface SessionKeyContractProps {
    dappUrl: AppURL
    contract: Address
    showControl: boolean
}

/**
 * A checkbox that manages session key permissions for a user.
 *
 * Initial state: Checkbox is checked if the contract has permissions (determined by
 * `hasPermissions(dappUrl, permissionRequest))`, otherwise unchecked.
 *
 * When unchecked, adds the contract to `targetContractsAtom` for permission (iframe)
 * and onchain revocation (call to the `SessionKeyValidator`). Actual revocation(s)
 * happen when user navigates back to the home page.
 */
export const SessionKeyContract = ({ dappUrl, contract, showControl }: SessionKeyContractProps) => {
    const [_, setTargetContracts] = useAtom(targetContractsAtom)
    const permissionRequest = {
        [PermissionNames.SESSION_KEY]: {
            target: contract,
        },
    }

    // Initial state is whether the permission is granted or not
    const [checked, setChecked] = useState(hasPermissions(dappUrl, permissionRequest))

    useEffect(() => {
        if (!showControl && checked) setChecked(false)
    }, [showControl, checked])

    return (
        <Checkbox.Root
            checked={checked}
            className="w-full flex justify-between items-baseline focus-within:underline py-2 gap-4 cursor-pointer disabled:cursor-not-allowed text-base-content/80 dark:text-neutral-content/80"
            onCheckedChange={(e: { checked: boolean }) => {
                // if user deselects it to un-grant the permission, we store it
                // in the atom to be used in the revokeSessionKey call
                if (e.checked) {
                    setTargetContracts((prev) => prev.filter((addr) => addr !== contract))
                } else {
                    setTargetContracts((prev) => (prev.includes(contract) ? prev : [...prev, contract]))
                }
                setChecked(e.checked)
            }}
        >
            <Checkbox.Label className="font-mono block overflow-hidden text-ellipsis">{contract}</Checkbox.Label>
            <Checkbox.Control className="shrink-0 size-5 rounded [&[data-state=checked]_[data-part=indicator]]:text-primary border-2 data-[focus]:bg-neutral-content/10 data-[state=checked]:data-[focus]:bg-primary/5 data-[focus]:border-base-content/30 border-base-content/20 flex items-center justify-center">
                <Checkbox.Indicator className="text-transparent">
                    <Check />
                </Checkbox.Indicator>
            </Checkbox.Control>
            <Checkbox.HiddenInput />
        </Checkbox.Root>
    )
}
