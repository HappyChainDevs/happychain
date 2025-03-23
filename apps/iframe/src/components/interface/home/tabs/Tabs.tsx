import { Tabs } from "@ark-ui/react/tabs"
import { Spinner } from "@phosphor-icons/react"
import type { PropsWithChildren } from "react"
import type { ContentType } from "#src/state/interfaceState"

interface TabProps {
    title: ContentType
    isDataLoading?: boolean
}

export const Tab = ({ title, isDataLoading }: TabProps) => {
    return (
        <Tabs.Trigger
            className="cursor-pointer text-sm font-semibold px-4 py-2 opacity-70 data-[selected]:opacity-100"
            value={title}
        >
            <div className="flex flex-row items-center gap-2">
                {title}
                {isDataLoading && <Spinner className="animate-spin text-[0.875em]" />}
            </div>
        </Tabs.Trigger>
    )
}

interface TabContentProps extends PropsWithChildren {
    title: ContentType
}

export const TabContent = ({ title, children }: TabContentProps) => {
    return (
        <Tabs.Content value={title} className="w-full max-w-prose mx-auto pt-2 px-2">
            {children}
        </Tabs.Content>
    )
}
