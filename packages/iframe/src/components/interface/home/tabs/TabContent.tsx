import { ContentType } from "../../../../state/interfaceState"
import GamesView from "./views/GamesView"
import TokenView from "./views/TokenView"
import ActivityView from "./views/activity/ActivityView"

interface TabContentProps {
    view: ContentType
}

const TabContent = ({ view }: TabContentProps) => {
    const renderTabContent = () => {
        switch (view) {
            case ContentType.TOKENS:
                return <TokenView />
            case ContentType.GAMES:
                return <GamesView />
            case ContentType.ACTIVITY:
                return <ActivityView />
            default:
                return (
                    <div className="flex flex-col w-full h-4/5 p-2 bg-slate-300 rounded-b-xl rounded-tr-xl">
                        No details available.
                    </div>
                )
        }
    }

    return <div className="flex flex-col w-full h-full">{renderTabContent()}</div>
}

export default TabContent
