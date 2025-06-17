import type { WalletPermissionCaveat } from "viem"

export function canonicalCaveatKey(caveats?: WalletPermissionCaveat[]) {
    if (!caveats?.length) return ""
    return caveats
        .map((c) => `${c.type}::${c.value}`)
        .toSorted()
        .join(",")
}

export function mergeCaveats(
    caveatsA: WalletPermissionCaveat[] | undefined,
    caveatsB: WalletPermissionCaveat[] | undefined,
) {
    if (!caveatsA) return caveatsB ?? []
    if (!caveatsB) return caveatsA
    return caveatsA.concat(caveatsB).filter(filterUnique)
}

export function filterUnique(a: WalletPermissionCaveat, index: number, array: WalletPermissionCaveat[]) {
    return array.findIndex((b) => b.type === a.type && b.value === a.value) === index
}
