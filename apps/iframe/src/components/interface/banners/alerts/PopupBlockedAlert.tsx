import type { PropsWithChildren } from "react"
import { Banner } from "#src/components/primitives/banner/Banner.tsx"

export const PopupBlockedAlert = ({ onClose }: PropsWithChildren<{ onClose: () => void }>) => {
    return (
        <Banner intent="warning" onClose={onClose}>
            <div className="flex flex-col gap-1 text-sm font-bold">
                <div>A popup was blocked by your browser.</div>
                <div>Please enable popups to review and approve transactions.</div>
            </div>
        </Banner>
    )
}
