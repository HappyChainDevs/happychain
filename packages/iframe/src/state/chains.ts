import { chains as _chains } from "@happychain/sdk-shared"
import { atomWithStorage } from "jotai/utils"

export const chainsAtom = atomWithStorage("supported:chains", Object.values(_chains))
