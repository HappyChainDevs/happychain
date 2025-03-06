import { Checkbox } from "@ark-ui/react"
import { Check } from "@phosphor-icons/react"
import { useAtom } from "jotai"
import { useEffect, useState } from "react"
import type { Address } from "viem"
import { targetContractsAtom } from "#src/state/interfaceState"
import type { AppURL } from "#src/utils/appURL"

interface SessionKeyContractProps {
    dappUrl: AppURL
    contract: Address
    showControl: boolean
}
export const SessionKeyContract = ({ contract, showControl }: SessionKeyContractProps) => {
    const [targetContracts, setTargetContracts] = useAtom(targetContractsAtom)
    const [checked, setChecked] = useState(targetContracts.includes(contract))

    useEffect(() => {
        if (!showControl && checked) setChecked(false)
    }, [showControl, checked])

    return (
        <Checkbox.Root
            checked={checked}
            className="w-full flex justify-between items-baseline focus-within:underline py-2 gap-4 cursor-pointer disabled:cursor-not-allowed text-base-content/80 dark:text-neutral-content/80"
            onCheckedChange={(e: { checked: boolean }) => {
                if (e.checked) {
                    setTargetContracts((prev) => [...prev, contract])
                } else {
                    setTargetContracts((prev) => prev.filter((addr) => addr !== contract))
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
