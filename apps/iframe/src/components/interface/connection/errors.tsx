import { CreateAccount } from "@happy.tech/boop-sdk"
import type { ConnectionProvider } from "@happy.tech/wallet-common"
import { EIP1193UserRejectedRequestError } from "@happy.tech/wallet-common"
import { cx } from "class-variance-authority"
import type { PropsWithChildren } from "react"
import { DotLinearMotionBlurLoader } from "#src/components/loaders/DotLinearMotionBlurLoader"
import { Button } from "#src/components/primitives/button/Button"
import { FirebaseErrorCode, isFirebaseError } from "#src/connections/firebase/errors"
import { ConnectionProviderBusyError } from "#src/connections/firebase/services/FirebaseConnector"
import { signalClosed } from "#src/utils/walletState"

export function isCreateAccountError(error: unknown): boolean {
    if (!error) return false
    if (typeof error !== "object") return false
    if (!("status" in error)) return false
    if (typeof error.status !== "string") return false
    const successOpts: string[] = [CreateAccount.Success, CreateAccount.AlreadyCreated]
    return !successOpts.includes(error.status)
}

export function isBusyProviderError(error: unknown): boolean {
    return error instanceof ConnectionProviderBusyError
}

export function isUserRejectedRequestError(error: unknown): boolean {
    return isFirebaseError(error, FirebaseErrorCode.PopupClosed) || error instanceof EIP1193UserRejectedRequestError
}

export enum ConnectErrors {
    PopupBlocked = "popup-blocked",
    CreateAccountFailed = "create-account-failed",
    ConnectionProviderBusy = "connection-provider-busy",
}

export function ErrorDisplay({ error, onAccept }: { error?: ConnectErrors; onAccept: () => void }) {
    return (
        <>
            <ErrorComponent error={error} />
            <div className="flex items-center justify-center mt-4 ">
                <Button intent="secondary" type="button" className="w-full h-fit justify-center" onClick={onAccept}>
                    Okay
                </Button>
            </div>
        </>
    )
}

function ErrorComponent({ error }: { error?: ConnectErrors }) {
    switch (error) {
        case ConnectErrors.PopupBlocked:
            return <PopupBlockedWarning />
        case ConnectErrors.CreateAccountFailed:
            return <CreateAccountFailedWarning />
        case ConnectErrors.ConnectionProviderBusy:
            return <ConnectionProviderBusyWarning />
        default:
            return <GenericConnectionWarning />
    }
}

function WarningStyles({ children }: PropsWithChildren) {
    return (
        <div
            role="alert"
            className="animate-fadeIn space-y-[1ex] text-content border-warning border rounded-lg py-[2ex] px-[1em] text-xs text-center"
        >
            {children}
        </div>
    )
}
function PopupBlockedWarning() {
    return (
        <WarningStyles>
            <p>The popup was blocked.</p>
            <p>Please enable popups to sign in and try again.</p>
        </WarningStyles>
    )
}

function ConnectionProviderBusyWarning() {
    return (
        <WarningStyles>
            <p>This provider is still processing a recent login attempt.</p>
            <p>Please wait a few seconds and try again.</p>
        </WarningStyles>
    )
}

function CreateAccountFailedWarning() {
    return (
        <WarningStyles>
            <p>Failed to create a Happy Account.</p>
            <p>This is likely something wrong on our side, please wait a minute and try again.</p>
        </WarningStyles>
    )
}

function GenericConnectionWarning() {
    return (
        <WarningStyles>
            <p>Unable to set up your account and complete login.</p>
            <p>Please check your connection and try signing in again.</p>
        </WarningStyles>
    )
}

export function PendingProvider({ provider, onCancel }: { provider: ConnectionProvider; onCancel: () => void }) {
    return (
        <>
            <div className="overflow-y-auto scrollbar-thin">
                <LoginPending provider={provider} />
            </div>
            <CloseButton />
            <CancelButton cancel={() => onCancel()} />
        </>
    )
}

export function CloseButton() {
    return (
        <Button intent="ghost" type="button" className="h-fit justify-center" onClick={signalClosed}>
            Close
        </Button>
    )
}

export function CancelButton({ cancel }: { cancel: () => void }) {
    return (
        <Button intent="outline-negative" type="button" className="h-fit justify-center" onClick={cancel}>
            Cancel
        </Button>
    )
}

export function LoginPending({ provider }: { provider?: ConnectionProvider }) {
    return (
        <div className="grid gap-8">
            <div className="flex items-center justify-center gap-4">
                <img alt="HappyChain Logo" src={"/images/happychainLogoSimple.png"} className="h-10" />
                <DotLinearMotionBlurLoader />
                <img
                    className={cx("h-8", provider?.id === "injected:wallet.injected" && "dark:invert")}
                    src={provider?.icon}
                    alt={`${provider?.name} icon`}
                />
            </div>
            <div className="text-center flex items-center justify-center">
                Verify your {provider?.name} account to continue with HappyChain.
            </div>
        </div>
    )
}
