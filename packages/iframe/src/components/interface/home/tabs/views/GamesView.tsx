import { appList } from "../../../../../utils/lists"

/** Displays recently played games that the user logged into. */
const GamesView = () => {
    return (
        <div className="flex flex-col w-full h-4/5 p-2 bg-slate-300 rounded-b-xl rounded-tr-xl">
            {appList?.length > 0 ? (
                appList.map((app) => (
                    <div key={app.name} className="flex flex-row items-center justify-between px-2 h-12">
                        <span>{`${app.name}`}</span>
                    </div>
                ))
            ) : (
                <div>No Games Listed.</div>
            )}
        </div>
    )
}

export default GamesView
