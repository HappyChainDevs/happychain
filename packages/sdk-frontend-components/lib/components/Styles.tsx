/** @jsxImportSource preact */
import { useMemo } from "preact/hooks"
import badgeStyles from "../styles/badge.css?inline"
import propertyStyles from "../styles/property.css?inline"
import transitionStyles from "../styles/transition.css?inline"

function enforceBoolean(disableStyles: boolean | string | undefined) {
    if (typeof disableStyles === "boolean") {
        return disableStyles
    }

    return disableStyles !== "false"
}

export function Styles({ disableStyles }: { disableStyles?: boolean | string }) {
    const includeStyles = useMemo(() => !enforceBoolean(disableStyles), [disableStyles])

    if (!includeStyles) return null

    return (
        <style>
            {propertyStyles}
            {badgeStyles}
            {transitionStyles}
        </style>
    )
}
