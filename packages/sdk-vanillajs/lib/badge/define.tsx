/** @jsxImportSource preact */
export type { BadgeProps } from "./badge"

function setStyles(stylesId: string, css: string) {
    const prev = document.head.querySelector(`#${stylesId}`)

    if (prev) {
        prev.innerHTML = css
    } else {
        const style = document.createElement("style")
        style.id = stylesId
        style.innerHTML = css
        document.head.appendChild(style)
    }
}

export async function defineBadgeComponent(componentName = "connect-button", overrideStyles = true) {
    const [{ Badge }, { default: register }, { default: css }] = await Promise.all([
        import("./badge"),
        import("preact-custom-element"),
        import("./styles/property.css?inline"),
    ])

    // we can't create custom properties within the shadow dom,
    // so we will create outside here and append
    if (!overrideStyles) {
        setStyles("happychain-inline-styles", css)
    }

    if (!customElements.get(componentName)) {
        register(Badge, componentName, ["disable-styles"], { shadow: !overrideStyles })
    }
}
