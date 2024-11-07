import { useAtomValue } from "jotai"
import { kernelAccountAtom } from "#src/state/smartAccount.ts"

export function useSmartAccount() {
    useAtomValue(kernelAccountAtom)
}
