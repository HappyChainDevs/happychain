import { DevTools, useAtomsDebugValue, useAtomsDevtools } from "jotai-devtools"

import "jotai-devtools/styles.css"

const JotaiDebug = () => {
    // An atom that contains a list of all the names and values of all the atoms in the app.
    // This enables inspecting them the in the React devtool extension.
    // (By default in Next, the atoms are listed but they don't have their proper names.)
    // Note that the naming here relies on atoms having their `debugLabel` properties set.
    useAtomsDebugValue()
    // Enables tracking atom value changes in the Redux dev tool, as well as time travelling, etc
    // The Redux dev tool needs to be open and a state change to happen for it to display anything.
    useAtomsDevtools("atomDevtools")
    return <DevTools />
}

/**
 * Render the UI Jotai devtools in development mode after hydration.
 * Also enables visualizing atoms in the browser's React & Redux devtools.
 *
 * This has to be function so that we avoid calling the hooks during server side rendering.
 */
export function jotaiDebug(isHydrated: boolean) {
    return isHydrated ? <JotaiDebug /> : null
}
