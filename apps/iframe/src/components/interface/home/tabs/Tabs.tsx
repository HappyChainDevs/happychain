import { Tabs } from "@ark-ui/react/tabs"
import { Spinner } from "@phosphor-icons/react"
import type { PropsWithChildren } from "react"
import type { ContentType } from "#src/state/interfaceState"

interface TabProps {
    title: ContentType
    isChildDataLoading?: boolean
}

export const Tab = ({ title, isChildDataLoading }: TabProps) => {
    return (
        <Tabs.Trigger
            className="cursor-pointer text-sm font-semibold px-4 py-2 opacity-70 data-[selected]:opacity-100 flex items-center gap-2"
            value={title}
        >
            {title}
            {isChildDataLoading && <Spinner className="animate-spin text-[0.875em]" />}
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
