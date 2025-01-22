# @happy.tech/worker

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

## Installation

```ts
import { SharedWorkerPlugin } from '@happy.tech/worker'

// vite.config.ts
export default defineConfig({
  plugins: [ SharedWorkerPlugin()]
})
```

## Basic Usage

Define the functions you want to run in the worker in a `.sw.ts` file. They will run on the shared
worker but you will be able to call them seamlessly from your app by importing the `sw.ts` file.

### Shared Data Example
```ts
// worker.sw.ts
let pageLoads = 0;
export async function getPageLoads() { // worker exports are always async
    return ++pageLoads
}

// app.tsx @ localhost:1234
import { getPageLoads } from './worker.sw'
console.log({ pageLoads: await getPageLoads() }) // 1

// app.tsx @ localhost:4321
import { getPageLoads } from './worker.sw'
console.log({ pageLoads: await getPageLoads() }) // 2
```

### Communication Example

```ts
// worker.sw.ts
import { worker } from "@happy.tech/worker/runtime"
export { addMessageListener, dispatch } from "@happy.tech/worker/runtime"
worker.addMessageListener((data: unknown) => {
    console.log(data) // "hello worker, from client"
    worker.dispatch(worker.ports()[0], "hello client 1, from worker")
    worker.broadcast("hello everyone, from worker")
})
export function sayHello() { 
  worker.broadcast("Hello!")
}

// app.tsx
import { addMessageListener, dispatch, sayHello } from "./testing.sw"
addMessageListener((data: unknown) => console.log(data)) // "hello client 1, from worker", "hello everyone, from worker"
dispatch("hello worker, from client")
await sayHello() // worker will broadcast => "Hello!"
```

Note that the worker cannot send messages (`broadcast` and `dispatch`) when it initializes, as it is loaded before the clients, and so the clients won't be ready to receive its messages yet.

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
