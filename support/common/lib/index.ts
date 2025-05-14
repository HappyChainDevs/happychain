// === SERVICES ====================================================================================

export { createStorage } from "./services/storage"

// === COLLECTIONS =================================================================================

export { getOrSet, getOrSetAsync, HappyMap } from "./collections/map"
export { Map2 } from "./collections/map2"
export { FIFOCache } from "./collections/fifoCache"

// === UTILS =======================================================================================

export {
    bigIntMax,
    bigIntReplacer,
    bigIntReviver,
    bigIntToZeroPadded,
    serializeBigInt,
    deserializeBigInt,
    parseBigInt,
    type BigIntSerialized,
} from "./utils/bigint"

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
    Values,
    TupleUnion,
    UnionToTuple,
    MapTuple,
    ObjectFromTuples,
    RecursiveReplace,
} from "./utils/types"

export { isAddress } from "./utils/address"
export { HappyMethodNames, TransactionType } from "./utils/constants"
export { nowInSeconds } from "./utils/date"
export { debounce } from "./utils/debounce"
export { unknownToError } from "./utils/error"
export { fetchWithRetry } from "./utils/fetch"
export { binaryPartition, partition } from "./utils/iterables"
export { accessorsFromAtom, atomWithCompare, atomWithCompareAndStorage, createBigIntStorage } from "./utils/jotai"
export { LogLevel, type LogTag, Logger, type TaggedLogger, logLevel } from "./utils/logger"
export { Mutex } from "./utils/mutex"
export { getProp, hasDefinedKey, hasKey, hasOwnKey, ifDef } from "./utils/objects"
export { promiseWithResolvers } from "./utils/promises"
export type { PromiseWithResolvers, RejectType, ResolveInputType, ResolveType } from "./utils/promises"
export { entries, keys } from "./utils/records"
export { validateNumericInput } from "./utils/regexChecks"
export { sleep } from "./utils/sleep"
export { onlyUnique } from "./utils/streams"
export { stringify } from "./utils/string"
export { throttle } from "./utils/throttle"
export { getUrlProtocol } from "./utils/urlProtocol"
export { type UUID, createUUID } from "./utils/uuid"

// === DATA ========================================================================================

export { injectedProviderInfo, happyProviderInfo } from "./data/providers"
export { blankIcon, happyLogo128x128 } from "./data/icons"
