import { Tabs } from "@ark-ui/react/tabs"
import { useState } from "react"
import { ContentType } from "../../state/interfaceState"
import { Tab } from "./home/tabs/Tab"
import { TabContent } from "./home/tabs/TabContent"
import GamesView from "./home/tabs/views/GamesView"
import TokenView from "./home/tabs/views/TokenView"
import ActivityView from "./home/tabs/views/activity/ActivityView"

const WalletContentInfo = () => {
    const [view, setView] = useState<string>(ContentType.TOKENS)

    return (
        <div className="flex size-full items-start justify-center flex-col px-1 py-2">
            <Tabs.Root
                defaultValue={ContentType.TOKENS}
                className="size-full"
                lazyMount
                unmountOnExit
                onValueChange={(d) => setView(d.value)}
            >
                <Tabs.List className="gap-2 space-x-1">
                    <Tab title={ContentType.TOKENS} active={view} />
                    <Tab title={ContentType.GAMES} active={view} />
                    <Tab title={ContentType.ACTIVITY} active={view} />
                </Tabs.List>

                <TabContent title={ContentType.TOKENS}>
                    <TokenView />
                </TabContent>

                <TabContent title={ContentType.GAMES}>
                    <GamesView />
                </TabContent>

                <TabContent title={ContentType.ACTIVITY}>
                    <ActivityView />
                </TabContent>
            </Tabs.Root>
        </div>
    )
}

export default WalletContentInfo
