import { ark } from "@ark-ui/react"
import { InfoIcon, WarningIcon, WarningOctagonIcon, XIcon } from "@phosphor-icons/react"
import type { PropsWithChildren } from "react"
import { recipeBanner } from "./variants"

const AlertLevelIcon = ({ intent }: { intent: string }) => {
    switch (intent) {
        case "info":
            return <InfoIcon className="text-info w-8 h-8" />
        case "warning":
            return <WarningIcon className="text-warning w-8 h-8" />
        case "error":
            return <WarningOctagonIcon className="text-error w-8 h-8" />
        default:
            return null
    }
}

export const Banner = ({
    intent,
    children,
    onClose,
}: PropsWithChildren<{ onClose: () => void; intent: "warning" | "info" | "error" }>) => {
    return (
        <ark.div className={recipeBanner({ intent })}>
            {/* Alert Level */}
            <div>
                <AlertLevelIcon intent={intent} />
            </div>

            {/* Content */}
            {children}

            {/* Close Button */}
            <div className="flex items-start grow h-full">
                <button type="button" onClick={onClose}>
                    <XIcon className="text-currentColor" />
                </button>
            </div>
        </ark.div>
    )
}
