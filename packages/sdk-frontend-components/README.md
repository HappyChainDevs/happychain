# Happychain Connection Badge


## Defining the component
When defining the component, `defineBadgeComponent` takes two optional parameters. the first is the name of the component you wish to use. i.e. `connect-button` (the default) will register a component usable with `<connect-button></connect-button>`

```js
import { defineBadgeComponent } from "@happychain/ui"

defineBadgeComponent()
defineBadgeComponent("connect-button", true) // (defaults)
```

## Frameworks
To use in react or other frameworks with typescript, you likely need to augment the JSX interface to supply the appropriate prop types for the custom element
```ts
// React
declare global {
    namespace JSX {
        interface IntrinsicElements {
            "connect-button": BadgeProps
        }
    }
}

// Preact
declare module "preact/jsx-runtime" {
    namespace JSX {
        interface IntrinsicElements {
            "connect-button": BadgeProps
        }
    }
}
```

## Custom Styles
by default the styles are isolated and self contained. The second argument of the `defineBadgeComponent` function enables or disables these strict styles. Additionally, a prop of `disable-styles` can be applied to fully disable the build in styles and apply your own.
```ts
defineBadgeComponent("connect-button", false) // disables styles
```

```css
connect-button {
    .happychain-icon { /*...*/ }
    .happychain-badge {
        &.initializing { /*...*/ }
        &.connecting { /*...*/ }
        &.connected { /*...*/ }
        &.disconnected { /*...*/ }
        &.error { /*...*/ }
    }

    /* badge animations */
    .slide-enter { /*...*/ }
    .slide-enter-active  { /*...*/ }
    .slide-exit { /*...*/ }
    .slide-exit-active { /*...*/ }
    .slide-enter-active  { /*...*/ }
    .slide-exit-active { /*...*/ }
}
```
