// === SERVICES ====================================================================================

export { createStorage } from "./services/storage"

// === COLLECTIONS =================================================================================

export { getOrSet, getOrSetAsync, transform, HappyMap } from "./collections/map"
export { Map2 } from "./collections/map2"
export { FIFOCache } from "./collections/fifoCache"
export { Stream } from "./collections/stream"
export { Heap, IndexedHeap } from "./collections/heap"

// === UTILS =======================================================================================

export {
    bigIntMax,
    bigIntMin,
    bigIntReplacer,
    bigIntReviver,
    bigIntToZeroPadded,
    isBigIntString,
    stringToBigInt,
    bigintToString,
    serializeBigInt,
    deserializeBigInt,
    parseBigInt,
    type BigIntString,
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
    Nullish,
    NotNull,
    NotUndefined,
    Defined,
    Obj,
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
    Select,
    Distribute,
    UnionFill,
} from "./utils/types"

export type { Keys, OptionalKeys, RequiredKeys, NonOptionalKeys, NonRequiredKeys } from "./types/keys"
export type { Override, DeepOverride } from "./types/override"

export { isHttpString, isDef, isNullish, isObj } from "./utils/types"

export { isAddress } from "./utils/address"
export { array, uniques, last } from "./utils/arrays"
export { type AssertionError, assertDef, assertType } from "./utils/assertions"
export { With } from "./utils/classes"
export { HappyMethodNames, TransactionType } from "./utils/constants"
export { nowInSeconds } from "./utils/date"
export { debounce } from "./utils/debounce"
export { unknownToError, tryCatch, tryCatchAsync, tryCatchU, tryCatchAsyncU, type Result } from "./utils/error"
export { fetchWithRetry } from "./utils/fetch"
export { type Fn, type Lazy, force } from "./utils/functions"
export { binaryPartition, partition, filterMap } from "./utils/iterables"
export { accessorsFromAtom, atomWithCompare, atomWithCompareAndStorage, createBigIntStorage } from "./utils/jotai"
export type { LogTag, TaggedLogger, LoggerOptions } from "./utils/logger"
export { LogLevel, Logger, logLevel, logTag } from "./utils/logger"
export { Mutex } from "./utils/mutex"
export {
    type UndefinedAsOptional,
    getProp,
    hasDefinedKey,
    hasKey,
    hasOwnKey,
    ifDef,
    isEmpty,
    pick,
    makeUndefinedOptional,
    assign,
    merge,
} from "./utils/objects"
export {
    promiseWithResolvers,
    delayed,
    waitForCondition,
    waitForValue,
    type NotPromise,
    type MaybePromise,
} from "./utils/promises"
export type {
    Awaitable,
    PromiseWithResolvers,
    Resolvers,
    RejectType,
    ResolveInputType,
    ResolveType,
} from "./utils/promises"
export { entries, keys } from "./utils/records"
export { validateNumericInput } from "./utils/regexChecks"
export { sleep, timeoutAfter } from "./utils/sleep"
export { retry } from "./utils/retry"
export { encodeUrlSafeBase64, decodeUrlSafeBase64 } from "./utils/base64"
export { onlyUnique } from "./utils/streams"
export { colors, noColors } from "./utils/colors"
export { stringify } from "./utils/string"
export { throttle } from "./utils/throttle"
export { getUrlProtocol } from "./utils/urlProtocol"
export { type UUID, createUUID } from "./utils/uuid"
export { formatMs } from "./utils/time"
export { createViemPublicClient } from "./utils/viem"

// === DATA ========================================================================================

export { injectedProviderInfo, happyProviderInfo } from "./data/providers"
export { blankIcon, happyLogo128x128 } from "./data/icons"
