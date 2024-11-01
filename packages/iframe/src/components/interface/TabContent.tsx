import { ContentType } from "../../state/interfaceState"
import { appList, historyList, tokenList } from "../../utils/lists"

interface TabContentProps {
    view: ContentType
}

const TabContent = ({ view }: TabContentProps) => {
    const defaultRender = () => {
        return <div className="flex flex-col w-full h-4/5 p-2 rounded-b-xl rounded-tr-xl">No details available.</div>
    }

    const renderContent = () => {
        switch (view) {
            case ContentType.TOKENS:
                return (
                    <div className="flex flex-col w-full max-h-4/5 overflow-y-auto p-2 rounded-b-xl rounded-tr-xl">
                        {tokenList && tokenList.length > 0
                            ? tokenList.map((token) => (
                                  <div
                                      key={token.name}
                                      className="flex flex-row items-center justify-between px-2 h-12"
                                  >
                                      <span>{`${token.name} (${token.symbol})`}</span>
                                      <span>{`${token.balance}`}</span>
                                  </div>
                              ))
                            : defaultRender()}
                    </div>
                )
            case ContentType.GAMES:
                return (
                    <div className="flex flex-col w-full h-4/5 p-2 rounded-b-xl rounded-tr-xl">
                        {appList && appList.length > 0
                            ? appList.map((app) => (
                                  <div key={app.name} className="flex flex-row items-center justify-between px-2 h-12">
                                      <span>{`${app.name}`}</span>
                                  </div>
                              ))
                            : defaultRender()}
                    </div>
                )
            case ContentType.HISTORY:
                return (
                    <div className="flex flex-col w-full h-4/5 p-2 rounded-b-xl rounded-tr-xl">
                        {historyList && historyList.length > 0
                            ? historyList.map((tx) => (
                                  <div key={tx} className="flex flex-row items-center justify-between px-2 h-12">
                                      <span>{`${tx}`}</span>
                                  </div>
                              ))
                            : defaultRender()}
                    </div>
                )
            default:
                return defaultRender()
        }
    }

    return <div className="flex flex-col w-full h-full">{renderContent()}</div>
}

export default TabContent
