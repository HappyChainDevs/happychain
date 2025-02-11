// === SERVICES ====================================================================================

export { createStorage } from "./services/storage"

// === UTILS =======================================================================================

export { type TaggedLogger, Logger, type LogTag, LogLevel } from "./utils/logger"

export { atomWithCompare, atomWithCompareAndStorage, accessorsFromAtom, createBigIntStorage } from "./utils/jotai"

export type {
    HTTPString,
    AssertAssignableTo,
    AssertCompatible,
    Optional,
    Prettify,
    TupleUnion,
    UnionToTuple,
    MapTuple,
    ObjectFromTuples,
    Hex,
} from "./utils/types"

export { bigIntMax, bigIntReplacer, bigIntReviver, bigIntToZeroPadded, toBigIntSafe } from "./utils/bigint"

export { validateNumericInput } from "./utils/regexChecks"

export { createUUID, type UUID } from "./utils/uuid"

export { nowInSeconds } from "./utils/date"

export { onlyUnique } from "./utils/streams"

export { debounce } from "./utils/debounce"

export { throttle } from "./utils/throttle"

export { promiseWithResolvers } from "./utils/promises"

export { sleep } from "./utils/sleep"

export type { PromiseWithResolvers, ResolveInputType, ResolveType, RejectType } from "./utils/promises"

export { keys, entries } from "./utils/records"

export { unknownToError } from "./utils/error"

export { HappyMethodNames, PermissionNames, TransactionType } from "./utils/constants"

export { Mutex } from "./utils/mutex"

export { getOrSet, getOrSetAsync, HappyMap } from "./collections/map"

export { Map2 } from "./collections/map2"

export { FIFOCache } from "./collections/fifo-cache"

export { fetchWithRetry } from "./utils/fetch"

// === DATA ========================================================================================

export { injectedProviderInfo, happyProviderInfo } from "./data/providers"

export { icon64x64, blankIcon } from "./data/icons"
