import { createLazyFileRoute } from "@tanstack/react-router"
import { PATHNAME_ROUTE_TOKENS, ScreenTokens } from "#src/v2/screens/tokens/Tokens"

export const Route = createLazyFileRoute(PATHNAME_ROUTE_TOKENS)({
    component: ScreenTokens,
})
