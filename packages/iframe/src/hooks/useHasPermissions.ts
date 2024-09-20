import { useAtomValue } from "jotai"
import { type PermissionsSpec, atomForPermissionsCheck } from "../state/permissions.ts"

export function useHasPermissions(permissions: PermissionsSpec) {
    const permissionsAtom = atomForPermissionsCheck(permissions)
    return useAtomValue(permissionsAtom)
}
