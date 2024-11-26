import { Tabs } from "@ark-ui/react/tabs"
import { ContentType } from "../../state/interfaceState"
import { Tab, TabContent } from "./home/tabs/Tabs"
import GamesView from "./home/tabs/views/GamesView"
import TokenView from "./home/tabs/views/TokenView"
import ActivityView from "./home/tabs/views/activity/ActivityView"

const WalletContentInfo = () => {
    return (
        <div className="flex size-full items-start justify-center flex-col px-1 py-2">
            <Tabs.Root defaultValue={ContentType.TOKENS} className="size-full" lazyMount unmountOnExit>
                <Tabs.List className="gap-2 space-x-1">
                    <Tab title={ContentType.TOKENS} />
                    <Tab title={ContentType.GAMES} />
                    <Tab title={ContentType.ACTIVITY} />
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
