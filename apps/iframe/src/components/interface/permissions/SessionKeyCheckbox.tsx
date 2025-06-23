import { Checkbox } from "@ark-ui/react"
import { CheckIcon } from "@phosphor-icons/react"
import { useMemo } from "react"
import type { Address } from "viem"
import { PermissionName } from "#src/constants/permissions"
import { useLocalPermissionChanges } from "#src/hooks/useLocalPermissionChanges"

interface SessionKeyContractProps {
    contract: Address
}

export const SessionKeyCheckbox = ({ contract }: SessionKeyContractProps) => {
    // Initial state is whether the permission is granted or not.
    const permissionRequest = useMemo(() => ({ [PermissionName.SessionKey]: { target: contract } }), [contract])
    const { grant, revoke, has } = useLocalPermissionChanges()

    return (
        <Checkbox.Root
            checked={has(permissionRequest)}
            className="w-full flex justify-between items-center focus-within:underline py-2 gap-4 cursor-pointer disabled:cursor-not-allowed text-base-content/80 dark:text-neutral-content/80"
            onCheckedChange={(e: { checked: boolean }) => {
                // if user deselects it to un-grant the permission, we store it
                // in the atom to be used in the revokeSessionKey call
                if (e.checked) grant(permissionRequest)
                else revoke(permissionRequest)
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
                    <CheckIcon />
                </Checkbox.Indicator>
            </Checkbox.Control>
            <Checkbox.HiddenInput />
        </Checkbox.Root>
    )
}
