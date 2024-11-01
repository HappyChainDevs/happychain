import { useState } from "react"

import { ContentType } from "../../state/interfaceState"
import Tab from "./home/tabs/Tab"
import TabContent from "./home/tabs/TabContent"

const WalletContentInfo = () => {
    const [view, setView] = useState<ContentType>(ContentType.TOKENS)

    return (
        <div className="flex size-full items-start justify-center flex-col px-1">
            <div className="flex flex-row items-start justify-center space-x-2">
                <Tab title={ContentType.TOKENS} setView={setView} />
                <Tab title={ContentType.GAMES} setView={setView} />
                <Tab title={ContentType.ACTIVITY} setView={setView} />
            </div>
            <div className="flex flex-col w-full h-4/5 p-2 bg-slate-300 dark:bg-base-300 rounded-b-xl rounded-tr-xl">
                <TabContent view={view} />
            </div>
        </div>
    )
}

export default WalletContentInfo
