import { Tabs } from "@ark-ui/react/tabs"
import { ContentType } from "#src/state/interfaceState"
import { Tab, TabContent } from "./home/tabs/Tabs"
import GamesView from "./home/tabs/views/GamesView"
import ActivityView from "./home/tabs/views/activity/ActivityView"
import TokenView from "./home/tabs/views/tokens/TokenView"
import FaucetView from "./home/tabs/views/faucet"

export const WalletContentInfo = () => {
    return (
        <Tabs.Root defaultValue={ContentType.TOKENS} className="size-full" lazyMount unmountOnExit>
            <div className="border-b z-10 sticky top-0 bg-base-200 border-neutral/10 dark:border-neutral/50">
                <Tabs.List className="max-w-prose mx-auto">
                    <Tab title={ContentType.TOKENS} />
                    {/*<Tab title={ContentType.GAMES} />*/}
                    <Tab title={ContentType.ACTIVITY} />
                    <Tab title={ContentType.FAUCET} />
                    <Tabs.Indicator className="w-[var(--width)] bg-primary h-0.5" />
                </Tabs.List>
            </div>

            <TabContent title={ContentType.TOKENS}>
                <TokenView />
            </TabContent>

            <TabContent title={ContentType.GAMES}>
                <GamesView />
            </TabContent>

            <TabContent title={ContentType.ACTIVITY}>
                <ActivityView />
            </TabContent>

            <TabContent title={ContentType.FAUCET}>
                <FaucetView />
            </TabContent>
        </Tabs.Root>
    )
}
