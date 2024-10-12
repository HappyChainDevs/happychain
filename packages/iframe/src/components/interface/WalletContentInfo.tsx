import { useAtom } from "jotai"
import { ContentType, walletInfoViewAtom } from "../../state/walletInfoView"
import Tab from "./home/tabs/Tab"
import TabContent from "./home/tabs/TabContent"

const WalletContentInfo = () => {
    const [view] = useAtom(walletInfoViewAtom)

    return (
        <div className="flex w-full h-full items-start justify-center flex-col px-1">
            <div className="flex flex-row items-start justify-center space-x-2">
                <Tab title={ContentType.TOKENS} />
                <Tab title={ContentType.GAMES} />
                <Tab title={ContentType.ACTIVITY} />
            </div>
            <div className="flex flex-col w-full h-4/5 p-2 bg-slate-300 rounded-b-xl rounded-tr-xl">
                <TabContent view={view} />
            </div>
        </div>
    )
}

export default WalletContentInfo
