import "./app.css"
import { register } from "@happychain/js"
import { Badge } from "../lib/badge.tsx"
import { defineBadgeComponent } from "../lib/define.tsx"

register() // initializes happychain provider

// register custom element
defineBadgeComponent("x-connect-button")

// merge web component interface
// declare module "preact/jsx-runtime" {
//     // biome-ignore lint/style/noNamespace: easiest way to merge custom web-component prop types as attributes
//     namespace JSX {
//         interface IntrinsicElements {
//             "x-connect-button": ComponentProps<typeof Badge>
//         }
//     }
// }

export function App() {
    return (
        <>
            <main>
                <div className="dark half">
                    <Badge />
                </div>

                <div className="light half">{/* <x-connect-button /> */}</div>
            </main>
        </>
    )
}
