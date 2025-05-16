import { shortenAddress } from "@happy.tech/wallet-common"
import { useAtomValue } from "jotai"
import type React from "react"
import type { PropsWithChildren } from "react"
import { isAddress } from "viem"
import { Button, type ButtonProps } from "#src/components/primitives/button/Button"
import { currentChainAtom } from "#src/state/chains"
import { userAtom } from "#src/state/user"
import { getAppURL } from "#src/utils/appURL"

interface LayoutProps extends PropsWithChildren {
    labelHeader?: React.ReactNode
    headline?: React.ReactNode
    description?: React.ReactNode
    hideActions?: boolean
    actions: {
        accept?: ButtonProps
        reject: ButtonProps
    }
}

export const Layout = ({ labelHeader, headline, description, actions: { accept, reject }, children }: LayoutProps) => {
    const user = useAtomValue(userAtom)
    const appURL = getAppURL()
    return (
        <main className="flex flex-col min-h-dvh bg-base-300">
            <header className="w-full fixed z-10 bg-base-300 border-b border-neutral/10 dark:border-neutral/50 p-2 text-center font-bold text-xs">
                <div className="mx-auto w-full max-w-prose">
                    <h1>{labelHeader ?? appURL}</h1>
                </div>
            </header>
            <div className="pt-12">
                <section className="w-full px-2">
                    <div className="mx-auto w-full grid gap-4 text-center max-w-prose">
                        <div title={user?.address} className="flex gap-2 text-start justify-center text-xs rounded-xl">
                            <div className="h-8 overflow-hidden aspect-square rounded-full bg-neutral/90">
                                {user?.avatar && (
                                    <img
                                        src={user?.avatar}
                                        alt={`${user?.email} avatar`}
                                        // This is required to avoid google avatars from sometimes failing
                                        // to load properly
                                        referrerPolicy="no-referrer"
                                    />
                                )}
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
                        {headline && <h1 className="font-bold text-xl">{headline}</h1>}
                        <p className="opacity-80 text-sm">{description}</p>
                    </div>
                </section>
                <div className="pb-6">{children}</div>

                <div className="mt-auto px-2 py-6 border-t border-neutral/10 dark:border-neutral/50">
                    <div className="w-full max-w-prose mx-auto grid gap-2 sm:grid-cols-2 ">
                        {accept && (
                            <Button {...accept} intent="primary" className="text-neutral-content justify-center" />
                        )}
                        <Button {...reject} intent="outline-negative" className="text-base-content justify-center" />
                    </div>
                </div>
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
    formatAsNumber?: boolean
}

/**
 * Renders a formatted detail line, optionally formatting numbers in US decimal style
 * and applying code-style whitespace rendering.
 *
 * - If `formatAsNumber` is true and `children` is a numeric string, it removes commas,
 *   parses it as a number, and formats it with `toLocaleString("en-US")`.
 * - Applies `whitespace-pre` or `whitespace-pre-line` based on `isCode`.
 */
export const FormattedDetailsLine = ({ children, isCode, formatAsNumber }: FormattedDetailsLineProps) => {
    let formattedContent = children

    if (formatAsNumber && typeof children === "string") {
        const numericString = children.replace(/,/g, "") // remove commas
        const numberValue = Number(numericString)

        if (!Number.isNaN(numberValue)) {
            // Format to US-style numbers (e.g. 1,234.56)
            formattedContent = numberValue.toLocaleString("en-US")
        }
    }

    return (
        <pre
            className={`overflow-auto text-ellipsis text-sm scrollbar-thin ${
                isCode ? "whitespace-pre" : "whitespace-pre-line"
            }`}
        >
            {formattedContent}
        </pre>
    )
}

interface LinkToAddressProps extends PropsWithChildren {
    address: string
    short?: boolean
}
export const LinkToAddress = ({ address: addressLabel, short }: PropsWithChildren<LinkToAddressProps>) => {
    const currentChain = useAtomValue(currentChainAtom)
    const blockExplorerUrl = currentChain.blockExplorerUrls ? currentChain.blockExplorerUrls[0] : ""
    return (
        <a
            title="Open on explorer"
            href={`${blockExplorerUrl}/address/${addressLabel}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary border-b border-primary/60 hover:bg-primary/40"
        >
            {
                // biome-ignore format: tidy
                isAddress(addressLabel) ? 
                    (short ? shortenAddress(addressLabel) : addressLabel) : 
                    addressLabel
            }
        </a>
    )
}
