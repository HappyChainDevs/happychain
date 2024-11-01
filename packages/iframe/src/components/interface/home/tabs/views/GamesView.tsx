import { appList } from "../../../../../utils/lists"

/** Displays recently played games that the user logged into. */
const GamesView = () => {
    return (
        <div className="flex flex-col rounded-es-xl rounded-e-xl size-full">
            {appList?.length > 0 ? (
                appList.map((app) => (
                    <div key={app.name} className="flex flex-row items-center justify-between h-12">
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
