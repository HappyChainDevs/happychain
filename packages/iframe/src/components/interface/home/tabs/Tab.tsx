import { Tabs } from "@ark-ui/react/tabs"
import { cx } from "class-variance-authority"
import type { ContentType } from "../../../../state/interfaceState"

interface TabProps {
    title: ContentType
    active: string
}

export const Tab = ({ title, active }: TabProps) => {
    return (
        <Tabs.Trigger
            className={cx("h-10 w-24 rounded-t-xl", title === active ? "bg-base-300" : "bg-base-200")}
            value={title}
        >
            {title}
        </Tabs.Trigger>
    )
}
