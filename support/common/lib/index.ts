// === SERVICES ====================================================================================

export { createStorage } from "./services/storage"

// === HOOKS =======================================================================================

export { useIsHydrated } from "./hooks/isHydrated"

// === UTILS =======================================================================================

export { atomWithCompare, atomWithCompareAndStorage, accessorsFromAtom, createBigIntStorage } from "./utils/jotai"

export type {
    HTTPString,
    AssertAssignableTo,
    AssertCompatible,
    Prettify,
    TupleUnion,
    UnionToTuple,
    MapTuple,
    ObjectFromTuples,
    Hex,
} from "./utils/types"

export { bigIntMax, bigIntReplacer, bigIntReviver, bigIntToZeroPadded } from "./utils/bigint"

export { validateNumericInput } from "./utils/regexChecks"

export { createUUID, type UUID } from "./utils/uuid"

export { nowInSeconds } from "./utils/date"

export { onlyUnique } from "./utils/streams"

export { debounce } from "./utils/debounce"

export { throttle } from "./utils/throttle"

export { promiseWithResolvers, sleep } from "./utils/promises"

export type { PromiseWithResolvers, ResolveInputType, ResolveType, RejectType } from "./utils/promises"

export { keys, entries } from "./utils/records"

export { unknownToError } from "./utils/error"

export type { SafeViemWalletClient, SafeViemPublicClient } from "./utils/safeViemClients"

export { convertToSafeViemWalletClient, convertToSafeViemPublicClient } from "./utils/safeViemClients"

export { hexSchema } from "./utils/zod"

export { HappyMethodNames, PermissionNames, TransactionType } from "./utils/constants"

export { getUrlProtocol } from "./utils/url"

export { Mutex } from "./utils/mutex"

export { getOrSet, getOrSetAsync, HappyMap } from "./collections/map"

export { Map2 } from "./collections/map2"

export { FIFOCache } from "./collections/fifo-cache"

// === DATA ========================================================================================

export { injectedProviderInfo, happyProviderInfo } from "./data/providers"

export { icon64x64, blankIcon } from "./data/icons"
