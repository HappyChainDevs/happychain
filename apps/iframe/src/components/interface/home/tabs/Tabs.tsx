import { Tabs } from "@ark-ui/react/tabs"
import type { PropsWithChildren } from "react"
import type { ContentType } from "#src/state/interfaceState"

interface TabProps {
    title: ContentType
}

export const Tab = ({ title }: TabProps) => {
    return (
        <Tabs.Trigger
            className="cursor-pointer text-sm font-semibold px-4 pt-4 pb-2 opacity-70 data-[selected]:opacity-100"
            value={title}
        >
            {title}
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
