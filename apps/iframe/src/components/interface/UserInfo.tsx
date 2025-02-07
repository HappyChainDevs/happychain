import { WalletType } from "@happy.tech/wallet-common"
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

    if (!account.address) {
        return <UserInfoLoader />
    }

    if (!activeProvider) {
        // This should never occur
        return
    }

    if (account.address !== user.address) {
        // this is expected to happen when userAtom changes, but wagmi has not yet updated
        // these changes will happen quickly, but not at the exact same time.
        return <UserInfoLoader />
    }
    return (
        <div className="flex flex-row items-center space-x-4">
            <div className="relative">
                <img
                    src={user.avatar}
                    alt={`${user.name}'s avatar`}
                    className="h-10 rounded-full"
                    // This is required to avoid google avatars from sometimes failing
                    // to load properly
                    referrerPolicy="no-referrer"
                />
                <img
                    src={activeProvider.icon}
                    alt={activeProvider.name}
                    className="h-5 rounded-full absolute bottom-0 end-0 bg-base-200"
                />
            </div>
            <div className="flex flex-col items-start justify-between">
                {user.type === WalletType.Social && <p>{user?.email || user?.name}</p>}
                <AddressInfo address={user.address} />
                <span className="flex ps-2 text-sm items-baseline">
                    <span className="font-bold">{formattedBalance}&nbsp;</span>
                    <span className="text-[0.9em] font-medium">$HAPPY</span>
                </span>
            </div>
        </>
    )
}

export default UserInfo
