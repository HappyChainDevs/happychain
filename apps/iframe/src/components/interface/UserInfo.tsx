import { formatUserBalance } from "@happy.tech/wallet-common"
import { useAtom, useAtomValue } from "jotai"
import { useAccount, useBalance } from "wagmi"
import { useActiveConnectionProvider } from "../../connections/initialize"
import { userAtom } from "../../state/user"
import UserInfoLoader from "../loaders/UserInfoLoader"
import AddressInfo from "./AddressInfo"
import { secondaryMenuVisibilityAtom } from "./menu-secondary-actions/state"

const UserInfo = () => {
    const user = useAtomValue(userAtom)
    const { data: balance } = useBalance({ address: user?.address })
    const formattedBalance = formatUserBalance(balance?.value)

    const [isVisible, setVisibility] = useAtom(secondaryMenuVisibilityAtom)
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
                <img
                    src={user.avatar}
                    alt={`${user.name}'s avatar`}
                    className="h-10 rounded-full"
                    // This is required to avoid google avatars from sometimes failing
                    // to load properly
                    referrerPolicy="no-referrer"
                />
                <div className="rounded-full absolute bottom-0 end-0 bg-base-200">
                    <img className="h-3 w-auto" src={activeProvider.icon} alt={activeProvider.name} />
                </div>
                <button
                    className="absolute z-10 opacity-0 size-full inset-0"
                    type="button"
                    title={isVisible ? "Close this menu" : "Open this menu"}
                    aria-label={isVisible ? "Close secondary actions menu" : "Open secondary actions menu"}
                    onClick={() => {
                        setVisibility(!isVisible)
                    }}
                >
                    {isVisible ? "Close account actions menu" : "Open account actions menu"}
                </button>
            </div>
            <div className="flex flex-col">
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
