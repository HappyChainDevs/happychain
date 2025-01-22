import type { PropsWithChildren } from "react"
import type { requestLabels } from "#src/constants/requestLabels"
import RequestDisplayHeader from "./RequestDisplayHeader"

interface RequestLayoutProps extends PropsWithChildren {
    method: keyof typeof requestLabels
}

const RequestLayout = ({ children, method }: RequestLayoutProps) => {
    return (
        <main className="flex h-dvh flex-col items-start justify-between gap-4 bg-base-300 p-4">
            <div className="flex size-full flex-col gap-4">
                <RequestDisplayHeader method={method} />
                {children}
            </div>
        </main>
    )
}

export default RequestLayout
