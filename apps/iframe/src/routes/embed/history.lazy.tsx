import { createLazyFileRoute } from "@tanstack/react-router"
import { PATHNAME_ROUTE_HISTORY, ScreenHistory } from "#src/v2/screens/history/History"

export const Route = createLazyFileRoute(PATHNAME_ROUTE_HISTORY)({
    component: ScreenHistory,
})
