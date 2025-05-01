// === SERVICES ====================================================================================

export { createStorage } from "./services/storage"

// === UTILS =======================================================================================

export { type TaggedLogger, Logger, type LogTag, LogLevel, logLevel } from "./utils/logger"

export { atomWithCompare, atomWithCompareAndStorage, accessorsFromAtom, createBigIntStorage } from "./utils/jotai"

export type {
    HTTPString,
    Hash,
    Hex,
    Address,
    UInt256,
    UInt192,
    UInt160,
    UInt128,
    UInt96,
    UInt64,
    UInt32,
    UInt16,
    UInt8,
    Int256,
    Int192,
    Int160,
    Int128,
    Int96,
    Int64,
    Int32,
    Int16,
    Int8,
    Bytes,
    AssertAssignableTo,
    AssertCompatible,
    Optional,
    Prettify,
    TupleUnion,
    UnionToTuple,
    MapTuple,
    ObjectFromTuples,
} from "./utils/types"

export {
    bigIntMax,
    bigIntReplacer,
    bigIntReviver,
    bigIntToZeroPadded,
    serializeBigInt,
    parseBigInt,
    type BigIntSerialized,
} from "./utils/bigint"

export { validateNumericInput } from "./utils/regexChecks"

export { createUUID, type UUID } from "./utils/uuid"

export { nowInSeconds } from "./utils/date"

export { onlyUnique } from "./utils/streams"

export { debounce } from "./utils/debounce"

export { throttle } from "./utils/throttle"

export { promiseWithResolvers } from "./utils/promises"

export {
    toBytes,
    toDynamicLengthBytes,
    getBytes,
    getDynamicLengthBytes,
    bytesToAddress,
    bytesToBigInt,
    bytesToNumber,
    bytesToHex,
} from "./utils/bytes"

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

export { hasKey, hasDefinedKey, getProp } from "./utils/objects"

export { stringify } from "./utils/string"

export { getUrlProtocol } from "./utils/urlProtocol"

export { isAddress } from "./utils/address"

// === DATA ========================================================================================

export { injectedProviderInfo, happyProviderInfo } from "./data/providers"

export { blankIcon, happyLogo128x128 } from "./data/icons"
