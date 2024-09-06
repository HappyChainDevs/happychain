interface TabProps {
    title: string
}

const Tab = ({ title }: TabProps) => {
    return (
        <button className="h-10 w-24 bg-slate-300 rounded-t-xl" type="button">
            {title}
        </button>
    )
}

export default Tab
