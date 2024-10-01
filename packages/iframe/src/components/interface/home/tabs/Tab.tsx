import { type ContentType, useContent } from "../../../../context/ContentContext"

interface TabProps {
    title: ContentType
}

const Tab = ({ title }: TabProps) => {
    const { setView } = useContent()
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
