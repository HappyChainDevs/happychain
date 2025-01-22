import { Checkbox } from "@ark-ui/react"
import { Check } from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import type { Address } from "viem"
import { grantPermissions, hasPermissions, revokePermissions } from "#src/state/permissions"
import type { AppURL } from "#src/utils/appURL"

interface SessionKeyContractProps {
    dappUrl: AppURL
    contract: Address
    showControl: boolean
}
export const SessionKeyContract = ({ contract, dappUrl, showControl }: SessionKeyContractProps) => {
    const [checked, setChecked] = useState(
        hasPermissions(dappUrl, {
            happy_sessionKey: {
                target: contract,
            },
        }),
    )

    useEffect(() => {
        if (!showControl && checked) setChecked(false)
    }, [showControl, checked])

    return (
        <Checkbox.Root
            checked={checked}
            className="w-full flex justify-between focus-within:underline py-2 gap-4 cursor-pointer disabled:cursor-not-allowed text-base-content/80 dark:text-neutral-content/80"
            onCheckedChange={(e: { checked: boolean }) => {
                checked
                    ? revokePermissions(dappUrl, {
                          happy_sessionKey: {
                              target: contract,
                          },
                      })
                    : grantPermissions(dappUrl, {
                          happy_sessionKey: {
                              target: contract,
                          },
                      })
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
