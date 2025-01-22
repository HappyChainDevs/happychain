import { DevTools, useAtomsDebugValue } from "jotai-devtools"

import "jotai-devtools/styles.css"

export function JotaiDevTools() {
    // An atom that contains a list of all the names and values of all the atoms in the app.
    // This enables inspecting them the in the React devtool extension.
    // (By default in Next, the atoms are listed but they don't have their proper names.)
    // Note that the naming here relies on atoms having their `debugLabel` properties set.
    useAtomsDebugValue()

    return <DevTools position="bottom-right" />
}
