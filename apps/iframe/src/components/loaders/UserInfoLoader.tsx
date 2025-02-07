const UserInfoLoader = () => {
    return (
        <div className="flex flex-row items-center space-x-4 animate-pulse">
            <div className="size-10 bg-neutral/40 rounded-full" />
            <div className="flex flex-col items-start justify-between space-y-2">
                <div className="w-24 h-4 bg-neutral/40 rounded" />
                <div className="w-40 h-4 bg-neutral/40 rounded" />
            </div>
        </div>
    )
}

export default UserInfoLoader
