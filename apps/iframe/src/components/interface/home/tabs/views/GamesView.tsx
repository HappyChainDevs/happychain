import { appList } from "../../../../../utils/lists"

/** Displays recently played games that the user logged into. */
const GamesView = () => {
    return (
        <>
            {appList?.length > 0 ? (
                <ul>
                    {appList.map((app) => (
                        <li key={app.name} className="min-h-12 flex items-center justify-between">
                            {app.name}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No games listed.</p>
            )}
        </>
    )
}

export default GamesView
