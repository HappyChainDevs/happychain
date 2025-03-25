import { createLazyFileRoute } from "@tanstack/react-router"
import { PATHNAME_ROUTE_TOKEN_HISTORY, ScreenTokenHistory } from "#src/v2/screens/tokens/history/TokenHistory"

export const Route = createLazyFileRoute(PATHNAME_ROUTE_TOKEN_HISTORY)({
    component: ScreenTokenHistory,
})
