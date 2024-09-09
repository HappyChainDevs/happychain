import { type HappyUser, WalletType } from "@happychain/sdk-shared"
import AddressInfo from "./AddressInfo"

interface UserProps {
    user: HappyUser
}

const UserInfo = ({ user }: UserProps) => {
    return (
        <div className="flex flex-row items-center space-x-4">
            <img src={user.avatar} alt={`${user.name}'s avatar`} className="h-12 rounded-full" />
            <div className="flex flex-col items-start justify-between">
                {user.type === WalletType.Social && <p>{user?.email || user?.name}</p>}
                <AddressInfo address={user.address} />
            </div>
        </div>
    )
}

export default UserInfo
