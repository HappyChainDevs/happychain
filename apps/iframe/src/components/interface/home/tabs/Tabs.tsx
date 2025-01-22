import { Tabs } from "@ark-ui/react/tabs"
import { cx } from "class-variance-authority"
import type { PropsWithChildren } from "react"
import type { ContentType } from "#src/state/interfaceState"

interface TabProps {
    title: ContentType
}

export const Tab = ({ title }: TabProps) => {
    return (
        <Tabs.Trigger className={cx("h-10 w-24 rounded-t-xl", "bg-base-200 data-[selected]:bg-base-300")} value={title}>
            {title}
        </Tabs.Trigger>
    )
}

interface TabContentProps extends PropsWithChildren {
    title: ContentType
}

export const TabContent = ({ title, children }: TabContentProps) => {
    return (
        <Tabs.Content value={title} className="size-full max-h-48">
            <div className="flex flex-col w-full max-h-48 size-full bg-base-300 rounded-es-xl rounded-e-xl">
                <div className="flex flex-col overflow-y-auto size-full bg-base-200 px-4 py-2">{children}</div>
            </div>
        </Tabs.Content>
    )
}
