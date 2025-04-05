# @happy.tech/uikit-react

A composable, accessible React component library that implements the Happy design system with support for multiple UI paradigms.

## Installation

```
bun add @happy.tech/design-tokens @happy.tech/uikit-react
```

## Setup custom Tailwind V4 theme

> Ensure you have Tailwind installed in your project.

Create and or update a CSS file and add the following :

```css
@import "tailwindcss" source(none);
@source "../path/to/@happy.tech/uikit-react"; 
@source "../path/to/your-project-own-components-and-pages"; 

/* Tailwind v4 config (design tokens, font declarations, custom composite tokens) */
@import "@happy.tech/design-tokens/tailwind.css";
```

The `@source` directive will help Tailwind to find and scan every file in your project for used class names.

Refer to the [Tailwind V4 documentation](https://tailwindcss.com/docs/detecting-classes-in-source-files#explicitly-registering-sources) for more guidance.


## Understanding the different UI paradigms

Each component supports multiple UI paradigms as namespaces:

- `.Skeuo`: Stands for "skeuormophic" - elements that mimics real-world object
- `.Gui`: Stands for "graphical user interface" - elements that mimics the minimalistic, retro look of early graphics-based operating system ([System 1](https://en.wikipedia.org/wiki/System_1), [Windows 1](https://en.wikipedia.org/wiki/Windows_1.0) etc.) ; `gui` elements live within `skeuo` elements. Most commonly used in the Happy wallet.
- `.Base`: elements that follow conventional/traditional digital interfaces ; (_not implemented for now_ - used by products like the DEX)

## Usage
### Example

The React UI Kit exposes components that follow a composable pattern that allows for flexible usage and customization. 

```tsx
import { Button } from "@happy.tech/uikit-react"

const MyButton = ({ handleOnClick }) => {
  return <Button.Gui type="button" onClick={handleOnClick}>
    Hey, click me !
   </Button.Gui>
}
```

```tsx
import { Collapsible } from "@happy.tech/uikit-react"

const MySection = () => {
  return <Collapsible.Gui.Root>
     <Collapsible.Gui.Trigger>Open this</Collapsible.Gui.Trigger>
     <Collapsible.Gui.Content >
         Lorem ipsum dolor sit amet consectetur adipisicing elit.        
     </Collapsible.Gui.Content>
   </Collapsible.Gui.Root>
}
```

All paradigm components are pre-styled using the design patterns defined in `@happy.tech/design-system`.