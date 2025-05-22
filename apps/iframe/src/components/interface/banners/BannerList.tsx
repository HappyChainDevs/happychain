import { useAtom } from "jotai"
import { bannersAtom } from "#src/state/banner"
import { PopupBlockedAlert } from "./alerts/PopupBlockedAlert"

function useBanners() {
    const [banners, setBanners] = useAtom(bannersAtom)
    return { banners, clearBanner: (id: string) => setBanners((prev) => prev.filter((banner) => banner !== id)) }
}

export const BannerList = () => {
    const { banners, clearBanner } = useBanners()

    if (!banners.length) return null

    return (
        <div className="flex flex-col w-full p-4 gap-2">
            {banners.map((banner) => {
                switch (banner) {
                    case "popup-blocked":
                        return <PopupBlockedAlert key={`banner-${banner}`} onClose={() => clearBanner(banner)} />
                    default:
                        return null
                }
            })}
        </div>
    )
}
