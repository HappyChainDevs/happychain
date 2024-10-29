import { Tabs } from "@ark-ui/react/tabs"
import type { PropsWithChildren } from "react"
import type { ContentType } from "../../../../state/interfaceState"

interface TabContentProps extends PropsWithChildren {
    title: ContentType
}

export const TabContent = ({ title, children }: TabContentProps) => {
    return (
        <Tabs.Content value={title} className="size-full max-h-48">
            <div className="flex flex-col w-full max-h-48 size-full p-2 bg-base-300 rounded-es-xl rounded-e-xl">
                <div className="flex flex-col overflow-y-auto size-full bg-base-200 px-4 py-2">{children}</div>
            </div>
        </Tabs.Content>
    )
}
