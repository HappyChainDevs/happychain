import type { Dispatch, SetStateAction } from "react"
import type { ContentType } from "./WalletContentInfo"

interface TabProps {
    title: ContentType
    setView: Dispatch<SetStateAction<ContentType>>
}

const Tab = ({ title, setView }: TabProps) => {
    return (
        <button
            className="h-10 w-24 bg-slate-300 rounded-t-xl"
            type="button"
            onClick={(e) => {
                e.stopPropagation()
                setView(title)
            }}
        >
            {title}
        </button>
    )
}

export default Tab
