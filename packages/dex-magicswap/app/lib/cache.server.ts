import {
  type Cache,
  type CacheEntry,
  type CachifiedOptions,
  type GetFreshValue,
  cachified,
  totalTtl,
  verboseReporter,
} from "@epic-web/cachified";
import { LRUCache } from "lru-cache";

const lruInstance = new LRUCache<string, CacheEntry>({ max: 1000 });

const lru: Cache = {
  set<T>(key: string, value: CacheEntry<T>) {
    const ttl = totalTtl(value?.metadata);
    return lruInstance.set(key, value, {
      ttl: ttl === Number.POSITIVE_INFINITY ? undefined : ttl,
      start: value?.metadata?.createdTime,
    });
  },
  get(key: string) {
    return lruInstance.get(key);
  },
  delete(key: string) {
    return lruInstance.delete(key);
  },
};

export const getCachedValue = async <T>(
  key: string,
  getValue: GetFreshValue<T>,
  options?: CachifiedOptions<T>,
) =>
  cachified(
    {
      cache: lru,
      ttl: 3_600_000, // 1 hour
      staleWhileRevalidate: 86_400_000, // 1 day
      key,
      getFreshValue: getValue,
      ...options,
    },
    verboseReporter(),
  );
