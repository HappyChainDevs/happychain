import { Tabs } from "@ark-ui/react/tabs"
import { cx } from "class-variance-authority"
import type { ContentType } from "../../../../state/interfaceState"

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
