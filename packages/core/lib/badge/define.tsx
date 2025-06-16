/** @jsxImportSource preact */

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

export async function defineBadgeComponent(componentName = "happychain-connect-button", disableShadowDOM = false) {
    const [{ BadgeWithStyles, BadgeWithoutStyles }, { default: register }, { default: css }] = await Promise.all([
        import("./badge"),
        import("preact-custom-element"),
        // See note in property.css as to why this is needed
        import("./styles/property.css?inline"),
    ])

    // we can't create custom properties within the shadow dom,
    // so we will create outside here and append
    if (!disableShadowDOM) setStyles("happychain-inline-styles", css)

    // can't re-define a custom element, so we check if it exists
    if (customElements.get(componentName)) return

    if (disableShadowDOM) register(BadgeWithoutStyles, componentName, [], { shadow: false })
    else register(BadgeWithStyles, componentName, [], { shadow: true })
}
