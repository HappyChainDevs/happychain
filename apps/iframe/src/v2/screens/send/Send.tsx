import { Button } from "@happy.tech/uikit-react"
import { Link } from "@tanstack/react-router"
import { BottomNavbar, Scrollable } from "#src/v2/layouts/root/screen"
import { FormSendTokens } from "./Form"

export const PATHNAME_ROUTE_SEND_TOKEN = "/embed/send"
export const ScreenSendToken = () => {
    return (
        <>
            <h1 className="font-bold">Send</h1>
            <Scrollable>
                <FormSendTokens />
            </Scrollable>
        </>
    )
}

export const BottomNavbarSendToken = () => {
    return (
        <BottomNavbar asChild>
            <nav>
                <BottomNavbar.Item asChild>
                    <Link to="/embed" className="gap-2">
                        <span
                            aria-hidden="true"
                            className="h-3.5 block aspect-square mask-icon-hds-system-gui-arrow-left bg-current"
                        />
                        <span>Back</span>
                    </Link>
                </BottomNavbar.Item>
            </nav>
        </BottomNavbar>
    )
}

export const ActionsSendToken = () => {
    return (
        <>
            <Button.Skeuo>
                <Button.Skeuo.Label>Confirm</Button.Skeuo.Label>
                <Button.Skeuo.Trigger form="send-token" type="submit">
                    Confirm
                </Button.Skeuo.Trigger>
            </Button.Skeuo>
            <Button.Skeuo>
                <Button.Skeuo.Label>Cancel</Button.Skeuo.Label>
                <Button.Skeuo.Trigger asChild>
                    <Link to="/embed">Go back</Link>
                </Button.Skeuo.Trigger>
            </Button.Skeuo>
        </>
    )
}
