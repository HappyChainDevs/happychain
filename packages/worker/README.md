# @happychain/worker

Fork of https://github.com/yjl9903/vite-plugin-sharedworker

The original no longer detects the workers as it relies on the path supplied by vite to end with
`?worker_file` however vite now appends workers with `?worker_file&type=module` and only does so in
development.

We need a polyfill fallback for some mobile browsers so this is modified to use
https://github.com/okikio/sharedworker. When in contexts where shared workers are [unsupported], we
fall back to a regular worker. Generally these environments don't have many simultaneous open tabs
though, so should be acceptable.

[unsupported]: https://caniuse.com/sharedworkers

We also added generalized error handling and logging.

## Basic Usage

Define the functions you want to run in the worker in a `.sw.ts` file. They will run on the shared
worker but you will be able to call them seamlessly from your app by importing the `sw.ts` file.

```ts
// worker.sw.ts
let pageLoads = 0;

// worker exports are always async
export async function getPageLoads() {
    return ++pageLoads
}
```

```ts
// app.tsx
import { getPageLoads } from './worker.sw'

console.log({ pageLoads: await getPageLoads() })
```

All data transmitted between client and server (including function parameters) must be serializable
using the [Structured Clone Algorithm][SCA].

[SCA]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm

## Implementation

The plugin generates two ESM packages (JS files) from your `.sw.ts` file to enable RPC style calls
between the app and the worker.

- One that will run on the shared worker, including the whole code in the `.sw.ts` as well as glue
  to communicate with the client (app).

- One on the client (app) side, which includes glue to be able to call the functions defined in the
  `.sw.ts` file.

Basically, the client package redefines the functions as async function stubs that package the
function name and the arguments, ship them over to the shared worker, and then listen to an answer
before returning the result.

Additionally, it is possible to exchange arbitrary messages between the app and the worker, using
`dispatch` and `addMessageListener` (available on both sides), as well as `broadcast` (available on
the worker to send messages to all connected clients at once).

The end result is a seamless RPC experience allowing you to simply export functions from the worker,
and import them in the client.