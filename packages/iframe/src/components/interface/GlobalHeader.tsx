import { ArrowLeft } from "@phosphor-icons/react"
import { Link, useLocation } from "@tanstack/react-router"

const GlobalHeader = () => {
    const location = useLocation()
    return (
        <div className="relative flex items-center w-full p-1">
            {location.pathname !== "/embed" && (
                <Link to={"/embed"}>
                    <ArrowLeft weight="bold" className="absolute left-2 top-5" />
                </Link>
            )}

            <span className="text-black text-xl py-2 mx-auto hidden lg:flex justify-center">🤠 HappyChain</span>
        </div>
    )
}

export default GlobalHeader
