import type { PropsWithChildren } from "react"
import UserDetails from "./UserDetails"

const RequestContent = ({ children }: PropsWithChildren) => {
    return (
        // Fragment element since the parent `RequestLayout` aligns
        // the first div and the <UserDetails /> component
        <>
            <div className="flex size-full flex-col gap-4 overflow-y-auto rounded-lg bg-base-200 p-4">
                <div className="flex flex-col size-full items-center justify-between gap-6">{children}</div>
            </div>
            <UserDetails />
        </>
    )
}

export default RequestContent
