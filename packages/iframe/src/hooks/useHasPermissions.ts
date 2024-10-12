import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { type PermissionsSpec, atomForPermissionsCheck } from "../state/permissions"

export function useHasPermissions(permissions: PermissionsSpec) {
    const permissionsAtom = useMemo(() => atomForPermissionsCheck(permissions), [permissions])
    return useAtomValue(permissionsAtom)
}
