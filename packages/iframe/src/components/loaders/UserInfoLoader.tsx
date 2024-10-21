const UserInfoLoader = () => {
    return (
        <div className="flex flex-row items-center space-x-4">
            <div className="h-12 w-12 bg-gray-400 rounded-full animate-pulse" />
            <div className="flex flex-col items-start justify-between space-y-2">
                <div className="w-24 h-4 bg-gray-400 rounded animate-pulse" />
                <div className="w-40 h-4 bg-gray-400 rounded animate-pulse" />
            </div>
        </div>
    )
}

export default UserInfoLoader
