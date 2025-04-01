import { Clipboard } from "@ark-ui/react"
import { Button, Collapsible } from "@happy.tech/uikit-react"
import { formatUserBalance, shortenAddress } from "@happy.tech/wallet-common"
import { Link } from "@tanstack/react-router"
import { atom, useAtom, useAtomValue } from "jotai"
import { useMemo } from "react"
import { useBalance } from "wagmi"
import { userAtom } from "#src/state/user"
import { PATHNAME_DAPPS_WITH_PERMISSIONS } from "#src/v2/screens/permissions/Permissions"

export const userDetailsCollapsibleVisibility = atom(false)
export const dialogConfirmLogOutVisibility = atom(false)

function useUserDetails() {
    const detailsVisibility = useAtom(userDetailsCollapsibleVisibility)
    const confirmLogOutVisibility = useAtom(dialogConfirmLogOutVisibility)
    const user = useAtomValue(userAtom)
    const queryNativeTokenBalance = useBalance({ address: user?.address })
    const formattedBalance = useMemo(
        () =>
            queryNativeTokenBalance?.data?.value
                ? formatUserBalance(queryNativeTokenBalance?.data?.value)
                : queryNativeTokenBalance?.status === "success"
                  ? "0.00"
                  : "--.--",
        [queryNativeTokenBalance?.data?.value, queryNativeTokenBalance?.status],
    )

    return {
        user,
        detailsVisibility,
        confirmLogOutVisibility,
        queryNativeTokenBalance,
        formattedBalance,
    }
}

interface DetailProps {
    label: React.ReactNode
    value: string
    copy?: string
    className?: string
}
const Detail = ({ label, value, copy, className = "" }: DetailProps) => {
    if (!copy)
        return (
            <div className={className}>
                <dt className="sr-only">{label}</dt>
                <dd>{value}</dd>
            </div>
        )
    return (
        <Clipboard.Root className="flex relative" value={copy}>
            <Clipboard.Label className="py-0.25 pe-3" asChild>
                <div className={className}>
                    <dt className="sr-only">{label}</dt>
                    <dd>{value}</dd>
                </div>
            </Clipboard.Label>
            <Clipboard.Control>
                <Clipboard.Input className="hidden" />
                <Clipboard.Trigger>
                    <Clipboard.Indicator
                        className="absolute end-0 top-1/2 -translate-y-1/2"
                        copied={<span>Copied</span>}
                    >
                        <span
                            className={`
            cursor-pointer
            w-4 h-5 block
            [mask-repeat:no-repeat] [mask-size:auto]
            mask-icon-hds-system-gui-copy
            pointer-events-none
            bg-current/50 
        `}
                        >
                            <span className="sr-only">Copy</span>
                        </span>
                    </Clipboard.Indicator>
                </Clipboard.Trigger>
            </Clipboard.Control>
        </Clipboard.Root>
    )
}

export const UserDetails = () => {
    const {
        user,
        formattedBalance,
        confirmLogOutVisibility: [, setDialogLogOutVisible],
        detailsVisibility: [openDetailsCollapsible, setCollapsibleOpen],
    } = useUserDetails()

    if (!user) return null
    return (
        <>
            <Collapsible.Gui.Root
                open={openDetailsCollapsible}
                onOpenChange={(details: { open: boolean | ((prev: boolean) => boolean) }) =>
                    setCollapsibleOpen(details.open)
                }
                className="size-full flex flex-col"
            >
                <Collapsible.Gui.Trigger>
                    <span className="inline-flex gap-1 items-baseline">
                        <span>{formattedBalance}</span>
                        <span className="opacity-50">HAPPY</span>
                    </span>
                </Collapsible.Gui.Trigger>
                <Collapsible.Gui.Content className="flex flex-col group-has-[[data-state=open]]:grow ">
                    <section className="shrink-0 border-b border-current/50 py-2">
                        <h1 className="sr-only">User details</h1>
                        <dl className="grid gap-2">
                            {user?.address && (
                                <Detail
                                    className="text-[1.125em]"
                                    label={"Wallet address"}
                                    copy={user.address}
                                    value={shortenAddress(user.address, 4)}
                                />
                            )}
                            {user?.name && <Detail className="text-[0.9825em]" label={"Name"} value={user.name} />}
                            {user?.email && <Detail className="text-[0.9825em]" label="Email" value={user.email} />}
                        </dl>
                    </section>
                    <section className="flex pt-2 justify-between [&_*]:px-0 grow flex-col">
                        <h1 className="sr-only">Actions</h1>
                        <Button.Gui asChild>
                            <Link
                                to={PATHNAME_DAPPS_WITH_PERMISSIONS}
                                className={`
                inline-flex gap-3 items-center justify-between
                after:content-[' ']
                after:w-4 after:h-3.5 after:block
                after:[mask-repeat:no-repeat] after:[mask-size:auto]
                after:mask-icon-hds-system-gui-arrow-right
                after:bg-current/50
                focus-within:after:bg-current
                after:pointer-events-none
            `}
                            >
                                Permissions
                            </Link>
                        </Button.Gui>
                        <Button.Gui
                            onClick={() => setDialogLogOutVisible(true)}
                            className="translate-y-1.5"
                            intent="negative"
                        >
                            Log out
                        </Button.Gui>
                    </section>
                </Collapsible.Gui.Content>
            </Collapsible.Gui.Root>
        </>
    )
}

/*
An alternative version of the user details.
Didn't get a confirmation on whether or not we should go with this version, so keeping it handy.
const _AltUserDetails = () => {
    const {
        user,
        formattedBalance,
        confirmLogOutVisibility: [, setDialogLogOutVisible],
        detailsVisibility: [openDetailsCollapsible, setCollapsibleOpen],
        queryNativeTokenBalance,
    } = useUserDetails()

    if (!user) return null

    return (
        <section className="flex pb-1 flex-col gap-2">
            <Dialog.Root>
                <Dialog.Trigger
                    className={`
        opacity-75
inline-flex
after:ms-2
after:content-[' ']
after:block
after:mask-icon-hds-system-gui-caret-down
after:w-2.5
after:bg-current
after:[mask-size:contain]
after:[mask-repeat:no-repeat]
after:[mask-position:center]

`}
                >
                    {shortenAddress(user.address)}
                </Dialog.Trigger>
                <Dialog.Backdrop className="bg-black/50" />
                <Dialog.Positioner className="flex overflow-auto absolute inset-0 size-full items-center justify-center">
                    <Dialog.Content className="flex flex-col border border-current/50 bg-black">
                        <section className="flex flex-col gap-1 border-b pb-4 border-current/50">
                            <p className="opacity-50 text-[0.725em]">Connected as</p>
                            <div className="flex flex-col gap-3">
                                {user?.address && (
                                    <Detail
                                        label={"Wallet address"}
                                        copy={user.address}
                                        value={shortenAddress(user.address, 4)}
                                    />
                                )}
                                {user?.name && <Detail label={"Name"} value={user.name} />}
                                {user?.email && <Detail label="Email" value={user.email} />}
                            </div>
                        </section>
                        <section className="flex pt-2 justify-between [&_*]:px-0 grow flex-col">
                            <Button.Gui asChild>
                                <Link
                                    to="/"
                                    className={`
    inline-flex gap-3 items-center justify-between
    after:content-[' ']
    after:w-4 after:h-3.5 after:block
    after:[mask-repeat:no-repeat] after:[mask-size:auto]
    after:mask-icon-hds-system-gui-arrow-right
    after:bg-current/50
    focus-within:after:bg-current
    after:pointer-events-none
`}
                                >
                                    Permissions
                                </Link>
                            </Button.Gui>
                            <Button.Gui className="translate-y-1.5" intent="negative">
                                Log out
                            </Button.Gui>
                        </section>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>

            <span className="font-bold text-[1.2em]">
                <span>{formattedBalance} HAPPY</span>
            </span>
        </section>
    )
}
*/
