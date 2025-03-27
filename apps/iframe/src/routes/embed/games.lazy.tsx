import { createLazyFileRoute } from "@tanstack/react-router"
import { PATHNAME_ROUTE_GAMES, ScreenGames } from "#src/v2/screens/games/Games"

export const Route = createLazyFileRoute(PATHNAME_ROUTE_GAMES)({
    component: ScreenGames,
})
