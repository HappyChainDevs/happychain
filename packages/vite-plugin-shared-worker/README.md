# @happychain/vite-plugin-shared-worker

Fork of https://github.com/yjl9903/vite-plugin-sharedworker

The original no longer detects the workers as it relies on the path supplied by vite to end with
`?worker_file` however vite now appends workers with `?worker_file&type=module` and only does so in
development.

We need a polyfill fallback for some mobile browsers so this is modified to use
https://github.com/okikio/sharedworker. When in contexts where shared workers are [unsupported], we
fallback to a regular worker. Generally these environments don't have many simultaneous open tabs
though, so should be acceptable.

[unsupported]: https://caniuse.com/sharedworkers

We also added generalized error handling and logging.

### Basic Usage

```ts
// worker.sw.ts
let pageLoads = 0;

// worker exports are always async
export async function getPageLoads() {
    return ++pageLoads
}

// app.tsx
import { getPageLoads } from './worker.sw'

console.log({ pageLoads: await getPageLoads() })
```
