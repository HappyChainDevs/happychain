# @happy.tech/design-system

A collection of design recipes and visual patterns built with [cva](https://github.com/joe-bell/cva/tree/main), [Tailwind V4](https://tailwindcss.com/) and pure CSS that power HappyChain UI Kits.

# Overview

This package provides the styling foundation for all shared HappyChain UI elements. It separates styling concerns from component implementation and is framework agnostic, allowing for :

- Reuse of styles across different component implementations
- Consistent styling across different UI paradigms
- Easy theming and customization
- [Type-safe styling](https://cva.style/docs/getting-started/typescript)

## Installation

```bashrc
bun add @happy.tech/design-system
```

## Understanding the different design paradigms

The design system supports multiple design paradigms :

- `skeuo`: Stands for "skeuormophic" - elements that mimics real-world objects with textures, shadows, and gradients. Most commonly used in the Happy wallet.
- `gui`: Stands for "graphical user interface" - elements that mimics the minimalistic, retro look of early graphics-based operating system ([System 1](https://en.wikipedia.org/wiki/System_1), [Windows 1](https://en.wikipedia.org/wiki/Windows_1.0) etc.) ; `gui` elements live within `skeuo` elements. Most commonly used in the Happy wallet.
- `base`: elements that follow conventional/traditional digital interfaces ; (_not implemented for now_ - used by products like the DEX)


## Usage

### Example

Import the design recipes to style your interface :

```tsx
import { recipeGuiButton } from '@happy.tech/design-system';

const MyCustomButton = ({ className, variant, size, ...props }) => {
  return (
    <button 
      className={recipeGuiButton({ className, variant, size })} 
      {...props} 
    />
  );
}
```

## Design recipes

### Structure

Each recipe follows a consistent structure :

```
.
└── src
     └── <component-name>
           ├── core.ts                  # core styles shared between all paradigm
           ├── index.ts                 # exports all recipes
           ├── recipeBaseElement.ts     # styling exclusive to the base/trad paradigm
           ├── recipeGuiElement.ts      # styling exclusive to the gui paradigm
           └── recipeSkeuoElement.ts    # styling exclusive to the skeuomorphic paradigm
```

### Building a paradigm recipe

Paradigm recipes all follow the same naming conventions (`recipe<Paradigm><ComponentName>.ts`), eg `recipeSkeuoButton.ts`, `recipeGuiMenu.ts` ...

Building a recipe is fairly straightforward : 

- define base styles
- define your [variants](https://cva.style/docs/getting-started/variants)

> A variant is a way to define different visual or functional variations of the same component through a type-safe API. 

- define the default values for your variants
- define [compound variants](https://cva.style/docs/getting-started/variants#compound-variants) (variants that only apply when multiple conditions are met, eg when intent is `primary` and aspect is `solid`, apply class `opacity-100`)
- export the recipe and its variants typing


```ts
import { cva, type VariantProps } from "cva"
import coreStyles from './core' // if you have any paradigm-agnostic styles

// Case 1: basic element
// -- Styling
export const recipeGuiBasicComponent = cva({
    base: [...coreStyles, 'common GUI styles'], // any styles common to all variants of the same paradigm
    variants: { ... },
    defaultVariants: { ... }, // Ensure you specify the default variants properly
  })

// -- Typing for the variants
export type GuiBasicComponentVariantsProps = VariantProps<typeof recipeGuiBasicComponent>

// Case 2: complex element
// -- Style each part and define their variants typing
const recipeGuiComplexComponentPart1 = cva({ ... }) name
export type GuiComplexComponentPart1VariantsProps = VariantProps<typeof recipeGuiComplexComponentPart1>

const recipeGuiComplexComponentPart2 = cva({ ... })
export type GuiComplexComponentPart2VariantsProps = VariantProps<typeof recipeGuiComplexComponentPart2>
// ... repeat for each part

// -- Compose the final component
export const recipeGuiComplexComponent = {
  part1: props => recipeGuiComplexComponentPart1(props),
  part2: props => recipeGuiComplexComponentPart2(props),
  // ... any other additional part
}

export type GuiComplexComponentVariantsProps = 
  VariantProps<typeof recipeGuiComplexComponent.part1> & 
  VariantProps<typeof recipeGuiFormField.part2>;
```

### Best practices

**1. In your recipes, re-use common variants names as much as possible.**

Regardless of the component, your styling recipe is likely to apply one or more of these variants :

- `intent`:  conveys what the component is trying to communicate to the user (eg: a negative, positive action). Intent primarily affects colors.
- `aspect`: defines the visual style or appearance variation of a component while maintaining its same general purpose. It's about **how the component looks**, not what it means (eg: `outline` = colored borders and text but transparent background ; `ghost` = colored text but transparent background and border ; `dimmed` = dimmed colorful background but full chroma text...)
- `scale`: defines how much visual space and emphasis a component has. It primarily affects padding, font size, margins, and other dimensional properties.

> DO NOT use `size` as a variant, as some HTML elements expose a `size` attribute, which would conflict with your variant. Prefer `scale` instead.


**2. Go mobile-first.**
Consider adding responsive variants for components that need different styles at different container sized.

**3. Use our design tokens as much as possible.**

In some cases, our custom Tailwind utility classes (including [our custom utilities](https://tailwindcss.com/docs/adding-custom-styles#customizing-your-theme)) might not be enough and you would have to reach to using [arbitrary values](https://tailwindcss.com/docs/adding-custom-styles#using-arbitrary-values). If so, **avoid raw values; like `bg-[#ffffff]` or `text-white`** and prefer using our **semantic** CSS variables.

 Using Tailwind spacing utilities is fine, as we use the same base spacing value (`4px`), but in some places you might need to use our `hds-` prefixed utilities. 


Refer to our generated tailwind theme, along with the [Tailwind docs](https://tailwindcss.com/docs/theme#default-theme-variable-reference).