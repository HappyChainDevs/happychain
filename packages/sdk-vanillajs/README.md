# HappyChain JS SDK

This SDK can be used to use HappyChain features in any JavaScript or TypeScript web app.

If you are using React, we recommend using the [React SDK](../sdk-react) instead.

For usage, see the [documentation](https://happychain.pages.dev/js/getting-started).

## Dev Notes

- `viem` is a dev dependency because we only import types from it, however we still end up bundling
  part of it because of the op-stack chain config import in `sdk-shared`.