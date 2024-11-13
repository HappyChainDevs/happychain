import type { PropsWithChildren } from "react"
import UserDetails from "./UserDetails"

const RequestContent = ({ children }: PropsWithChildren) => {
    return (
        <>
            <div className="flex grow flex-col gap-4 overflow-y-auto rounded-lg bg-base-200 p-4">
                <div className="flex flex-col gap-6">{children}</div>
            </div>
            <UserDetails />
        </>
    )
}

export default RequestContent
