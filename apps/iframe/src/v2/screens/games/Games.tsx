import { Button } from "@happy.tech/uikit-react"

export const PATHNAME_ROUTE_GAMES = "/embed/games"

export const ScreenGames = () => {
    return (
        <section className="flex flex-col gap-4 items-center text-center justify-center">
            <div className="w-12.5 h-21.5 [mask-position:center] [mask-size:contain] [mask-repeat:no-repeat] mask-icon-hds-system-gui-smiling-machine bg-current" />
            <div className="flex flex-col gap-1">
                <h1 className="font-bold capitalize">Play to earn</h1>
                <p className="">Browse a catalog of 25+ blockchain based games</p>
            </div>
            <Button.Gui asChild aspect="outline">
                <a href="/#" target="_blank" rel="noreferrer">
                    Explore games
                </a>
            </Button.Gui>
        </section>
    )
}
