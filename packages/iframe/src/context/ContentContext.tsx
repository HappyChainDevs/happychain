import type React from "react"
import { type ReactNode, createContext, useContext, useState } from "react"

export enum ContentType {
    TOKENS = "Tokens",
    GAMES = "Games",
    ACTIVITY = "Activity",
}

interface ContentContextProps {
    view: ContentType
    setView: React.Dispatch<React.SetStateAction<ContentType>>
    sendInFlight: boolean
    setSendInFlight: React.Dispatch<React.SetStateAction<boolean>>
}

const ContentContext = createContext<ContentContextProps | undefined>(undefined)

export const ContentProvider = ({ children }: { children: ReactNode }) => {
    // toggle between different info views in home page of the wallet
    const [view, setView] = useState<ContentType>(ContentType.TOKENS)
    // ಠ_ಠ true if: tx send was succesful (or) user has navigated back after accepting message in modal
    const [sendInFlight, setSendInFlight] = useState<boolean>(false)

    return (
        <ContentContext.Provider value={{ view, setView, sendInFlight, setSendInFlight }}>
            {children}
        </ContentContext.Provider>
    )
}

export const useContent = () => {
    const context = useContext(ContentContext)
    if (!context) {
        throw new Error("useContent must be used within a ContentProvider")
    }
    return context
}
