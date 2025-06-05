import { WalletType } from "@happy.tech/wallet-common"
import { useAtomValue } from "jotai"
import { useAccount } from "wagmi"
import { useActiveConnectionProvider } from "../../connections/initialize"
import { userAtom } from "../../state/user"
import { UserInfoLoader } from "../loaders/UserInfoLoader"
import { AddressInfo } from "./AddressInfo"

export const UserInfo = () => {
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
        <>
            <div className="flex items-baseline w-fit self-center relative">
                <div className="size-10 rounded-full overflow-hidden bg-base-200">
                    <img
                        src={user.avatar}
                        alt={`${user.name}'s avatar`}
                        width="40"
                        height="40"
                        loading="lazy"
                        className="w-full object-cover"
                        // This is required to avoid google avatars from sometimes failing
                        // to load properly
                        referrerPolicy="no-referrer"
                    />
                </div>
                <div className="rounded-full absolute bottom-0 end-0 bg-base-200">
                    <img className="h-3 w-auto" src={activeProvider.icon} alt={activeProvider.name} />
                </div>
            </div>
            <div className="flex gap-O.5 flex-col">
                {user.type === WalletType.Social && <p className="ps-1 font-semibold">{user?.name || user?.email}</p>}
                <AddressInfo address={user.address} />
            </div>
        </>
    )
}
