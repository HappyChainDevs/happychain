import "./ModeImage.css"

export type ModeImage = {
    lightSrc: string
    darkSrc: string
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src">

export const ModeImage = ({ lightSrc, darkSrc, className = "", alt = "", ...props }: ModeImage) => {
    // NOTE: I tried using a use-effect to pick the right picture, but the latency is horrendous,
    // at least in dev — 1.6s to second rerender & fetching the picture.

    // biome-ignore format: stupid parens
    return <>
        <img {...props} src={lightSrc} alt={alt} className="light-image" />
        <img {...props} src={darkSrc} alt={alt} className="dark-image"/>
    </>
}
