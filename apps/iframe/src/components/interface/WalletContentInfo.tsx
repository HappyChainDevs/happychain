import { Tabs } from "@ark-ui/react/tabs"
import { ContentType } from "../../state/interfaceState"
import { Tab, TabContent } from "./home/tabs/Tabs"
import GamesView from "./home/tabs/views/GamesView"
import ActivityView from "./home/tabs/views/activity/ActivityView"
import TokenView from "./home/tabs/views/tokens/TokenView"

const WalletContentInfo = () => {
    return (
        <Tabs.Root defaultValue={ContentType.TOKENS} className="size-full" lazyMount unmountOnExit>
            <Tabs.List className="border-b sticky top-0 bg-base-200 border-neutral/10 dark:border-neutral/50">
                <Tab title={ContentType.TOKENS} />
                <Tab title={ContentType.GAMES} />
                <Tab title={ContentType.ACTIVITY} />
                <Tabs.Indicator className="w-[var(--width)] bg-primary h-0.5" />
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
    )
}

export default WalletContentInfo
