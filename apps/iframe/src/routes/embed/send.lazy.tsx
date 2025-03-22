import { createLazyFileRoute } from "@tanstack/react-router"
import { ScreenSendToken } from "#src/v2/screens/send/Send"

export const Route = createLazyFileRoute("/embed/send")({
    component: ScreenSendToken,
})
