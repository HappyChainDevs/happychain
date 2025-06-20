import { Clipboard as ArkClipboard, useClipboard } from "@ark-ui/react/clipboard"
import { shortenAddress } from "@happy.tech/common"
import { CheckIcon, CopyIcon } from "@phosphor-icons/react"
import type { Address } from "viem"

interface AddressInfoProps {
    address: Address
}

export const AddressInfo = ({ address }: AddressInfoProps) => {
    const clipboard = useClipboard({ value: address })
    return (
        <div className="relative">
            <button
                type="button"
                title="Copy this address"
                className="absolute size-full"
                onClick={() => clipboard.copy()}
            >
                <span className="sr-only">Copy address</span>
            </button>
            <ArkClipboard.RootProvider
                className="w-max flex bg-neutral/5 focus-within:bg-neutral/10 dark:bg-neutral/50 dark:focus-within:bg-neutral/60 rounded-full text-[0.825rem] font-medium py-[0.05em] ps-[1ex] pe-[0.5ex] items-center gap-[1ex]"
                value={clipboard}
            >
                <ArkClipboard.Label>
                    <span>{shortenAddress(address, 4)}</span>
                </ArkClipboard.Label>
                <ArkClipboard.Control>
                    <ArkClipboard.Input className="hidden" />
                    <ArkClipboard.Indicator
                        copied={<CheckIcon weight="bold" className="animate-appear text-primary" />}
                    >
                        <CopyIcon weight="duotone" className="text-base-content" />
                    </ArkClipboard.Indicator>
                </ArkClipboard.Control>
            </ArkClipboard.RootProvider>
        </div>
    )
}
