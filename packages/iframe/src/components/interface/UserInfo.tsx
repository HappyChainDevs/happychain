import { WalletType } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useAccount } from "wagmi"
import { userAtom } from "../../state/user"
import AddressInfo from "./AddressInfo"
import UserInfoLoader from "../loaders/UserInfoLoader"

const UserInfo = () => {
    const user = useAtomValue(userAtom)

    // will display _wagmi_ connected account here to ensure wagmi is successfully connected
    const account = useAccount()

    if (!user) {
        console.warn("missing user.")
        return
    }

    if (!account.address) {
        return <UserInfoLoader />
    }

    if (account.address !== user.address) {
        console.warn("Could not validate user address")
        return
    }

    return (
        <div className="flex flex-row items-center space-x-4">
            <img src={user.avatar} alt={`${user.name}'s avatar`} className="h-12 rounded-full" />
            <div className="flex flex-col items-start justify-between">
                {user.type === WalletType.Social && <p>{user?.email || user?.name}</p>}
                <AddressInfo address={account.address} />
            </div>
        </div>
    )
}

export default UserInfo
