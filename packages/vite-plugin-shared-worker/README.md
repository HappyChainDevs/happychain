# @happychain/vite-plugin-shared-worker

Fork of https://github.com/yjl9903/vite-plugin-sharedworker

Original no longer detects the workers as it relies on the path supplied by vite to end with `?worker_file` however vite now appends workers with `?worker_file&type=module` and only in development

We need a ponyfill fallback for some mobile browsers so this is modified to use https://github.com/okikio/sharedworker. When in contexts where shared workers are unsupported it will fallback to a regular Worker. Generally these environments don't have many simultaneous open tabs though, so should be acceptable. https://caniuse.com/sharedworkers

Added generalized error handling, and logging
