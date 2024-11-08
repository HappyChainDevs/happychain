import { WalletType } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useAccount } from "wagmi"
import { useActiveConnectionProvider } from "../../connections/initialize"
import { userAtom } from "../../state/user"
import UserInfoLoader from "../loaders/UserInfoLoader"
import AddressInfo from "./AddressInfo"

const UserInfo = () => {
    const user = useAtomValue(userAtom)

    const activeProvider = useActiveConnectionProvider()

    // will display _wagmi_ connected account here to ensure wagmi is successfully connected
    const account = useAccount()

    if (!user) {
        // This should never occur
        console.warn("Failed to find active user")
        return
    }

    if (!activeProvider) {
        // This should never occur
        console.warn("Failed to find active provider")
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
            <div className="relative">
                <img
                    src={user.avatar}
                    alt={`${user.name}'s avatar`}
                    className="h-12 rounded-full"
                    // This is required to avoid google avatars from sometimes failing
                    // to load properly
                    referrerPolicy="no-referrer"
                />
                <img
                    src={activeProvider.icon}
                    alt={activeProvider.name}
                    className="h-5 rounded-full absolute bottom-0 right-0 bg-base-200"
                />
            </div>
            <div className="flex flex-col items-start justify-between">
                {user.type === WalletType.Social && <p>{user?.email || user?.name}</p>}
                <AddressInfo address={account.address} />
            </div>
        </div>
    )
}

export default UserInfo
