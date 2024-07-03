import { useEffect } from "react"

import { ConnectButton } from "@rainbow-me/rainbowkit"
import { atom, useAtom } from "jotai"

import { AppPage } from "src/pages/_app"

const X = atom(0)

const Home: AppPage = () => {
    const [_x, setX] = useAtom(X)
    useEffect(() => {
        setX(42)
    }, [setX])

    return (
        <div>
            <h1>Home</h1>
            <ConnectButton />
        </div>
    )
}

export default Home
