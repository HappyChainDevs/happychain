import { CreditCardIcon, type Icon, PaperPlaneTiltIcon, Swap } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import type { PropsWithChildren } from "react"

interface BaseAction {
    key: string
    label: React.ReactNode
    icon: Icon
    enabled: boolean
}

interface InternalAction extends BaseAction {
    to: string
    target?: never
}

interface ExternalAction extends BaseAction {
    to: string
    target: "_blank"
}

type Action = InternalAction | ExternalAction

const ACTIONS: Action[] = [
    {
        key: "send",
        to: "/embed/send",
        label: "Send",
        icon: PaperPlaneTiltIcon,
        enabled: true,
    },
    {
        key: "trade",
        to: "/",
        label: "Trade",
        icon: Swap,
        target: "_blank",
        enabled: false,
    },
    {
        key: "topup",
        to: "/",
        label: "Top up",
        icon: CreditCardIcon,
        target: "_blank",
        enabled: false,
    },
]

const baseClassName =
    "aspect-square text-[0.8725rem] focus:outline-none focus:[&_span:first-of-type]:bg-primary/20 flex flex-col gap-[1ex] items-center justify-center"

interface ActionButtonContentProps extends PropsWithChildren {
    icon: Icon
}

const ActionButtonContent = ({ icon: Icon, children }: ActionButtonContentProps) => (
    <>
        <span className="text-[1.3em] min-w-10 aspect-square flex items-center justify-center rounded-full bg-primary/10 hover:bg-primary/15 dark:bg-primary/10 dark:hover:bg-primary/20 text-primary">
            <Icon weight="fill" />
        </span>
        <span className="font-bold">{children}</span>
    </>
)

interface ActionButtonWrapperProps {
    action: Action
}

const ActionButtonWrapper = ({ action }: ActionButtonWrapperProps) => {
    if (!action.enabled) {
        return (
            <div className={`${baseClassName} cursor-not-allowed opacity-50`}>
                <ActionButtonContent icon={action.icon}>{action.label}</ActionButtonContent>
            </div>
        )
    }

    if (action.target === "_blank") {
        return (
            <a href={action.to} target="_blank" rel="noopener noreferrer" className={`${baseClassName} cursor-pointer`}>
                <ActionButtonContent icon={action.icon}>{action.label}</ActionButtonContent>
            </a>
        )
    }

    return (
        <Link to={action.to} className={`${baseClassName} cursor-pointer`}>
            <ActionButtonContent icon={action.icon}>{action.label}</ActionButtonContent>
        </Link>
    )
}

export const ActionButtons = () => {
    return (
        <div className="w-full flex items-center justify-center gap-4 px-2">
            {ACTIONS.map((action) => (
                <ActionButtonWrapper key={`action-${action.key}`} action={action} />
            ))}
        </div>
    )
}
