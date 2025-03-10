import { useAtomValue } from "jotai"
import type { PropsWithChildren } from "react"
import type { Address } from "viem"
import { Button, type ButtonProps } from "#src/components/primitives/button/Button"
import { currentChainAtom } from "#src/state/chains"
import { userAtom } from "#src/state/user"

interface LayoutProps extends PropsWithChildren {
    labelHeader: React.ReactNode
    headline: React.ReactNode
    description?: React.ReactNode
    hideActions?: boolean
    actions: {
        accept: ButtonProps
        reject: ButtonProps
    }
}

export const Layout = ({
    labelHeader,
    headline,
    description,
    actions: { accept, reject },
    hideActions,
    children,
}: LayoutProps) => {
    const user = useAtomValue(userAtom)
    return (
        <main className="flex flex-col min-h-dvh bg-base-300">
            <header className="w-full fixed z-10 bg-base-300 border-b border-neutral/10 dark:border-neutral/50 p-2 text-center font-bold text-xs">
                <div className="mx-auto w-full max-w-prose">
                    <h1>{labelHeader}</h1>
                </div>
            </header>
            <div className="pt-16">
                <section className="w-full px-2">
                    <div className="mx-auto w-full grid gap-4 text-center max-w-prose">
                        <h1 className="font-bold text-xl">{headline}</h1>
                        <div title={user?.address} className="flex gap-2 text-start justify-center text-xs rounded-xl">
                            <div className="h-8 overflow-hidden aspect-square rounded-full bg-neutral/90">
                                {user?.avatar && <img src={user?.avatar} alt={`${user?.email} avatar`} />}
                            </div>

                            <div className="grid">
                                <span className="font-bold">
                                    {user?.address.slice(0, 8)}...{user?.address.slice(-8)}
                                </span>

                                {user?.email && (
                                    <span className="opacity-75 dark:text-neutral-content/80 font-medium">
                                        {user.email}
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="opacity-80 text-sm">{description}</p>
                    </div>
                </section>
                <div className="pb-6">{children}</div>

                {!hideActions && (
                    <div className="mt-auto px-2 py-6 border-t border-neutral/10 dark:border-neutral/50">
                        <div className="w-full max-w-prose mx-auto grid gap-2 sm:grid-cols-2 ">
                            <Button {...accept} intent="primary" className="text-neutral-content justify-center" />
                            <Button
                                {...reject}
                                intent="outline-negative"
                                className="text-base-content justify-center"
                            />
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}

export const SectionBlock = ({ children }: PropsWithChildren) => {
    return <section className="max-w-prose py-2 px-2.5 grid gap-2 w-full mx-auto">{children}</section>
}

export const SectionTitle = ({ children }: PropsWithChildren) => {
    return <h1 className="text-xs font-semibold">{children}</h1>
}

export const SubsectionBlock = ({ children }: PropsWithChildren) => {
    return (
        <section className="bg-base-100/40 dark:bg-neutral/25 py-2 px-2.5 grid gap-4 [&_ol:not(:last-of-type)]:pb-8 rounded-md">
            {children}
        </section>
    )
}

export const SubsectionTitle = ({ children }: PropsWithChildren) => {
    return <h2 className="opacity-50 text-xs">{children}</h2>
}

export const SubsectionContent = ({ children }: PropsWithChildren) => {
    return <div className="grid gap-1">{children}</div>
}

interface FormattedDetailsLineProps extends PropsWithChildren {
    isCode?: boolean
}

export const FormattedDetailsLine = ({ children, isCode }: FormattedDetailsLineProps) => {
    return (
        <pre
            className={`overflow-auto tabular-nums text-ellipsis [scrollbar-width:thin] ${isCode ? "whitespace-pre" : "whitespace-pre-line"}`}
        >
            {children}
        </pre>
    )
}

interface LinkToAddressProps extends PropsWithChildren {
    address: Address
}
export const LinkToAddress = ({ children, address }: LinkToAddressProps) => {
    const currentChain = useAtomValue(currentChainAtom)
    const blockExplorerUrl = currentChain.blockExplorerUrls ? currentChain.blockExplorerUrls[0] : ""
    return (
        <a
            title="Open on explorer"
            href={`${blockExplorerUrl}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
        >
            {children}
        </a>
    )
}
