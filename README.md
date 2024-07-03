# Firestarter

Web3 project temmplate.

## Installation

1. Install pre-requisite tooling:
   - Make
   - [Foundry](https://github.com/foundry-rs/foundry)
   - Node.js & [PNPM](https://pnpm.io/) (`npm install -g pnpm`)
     - Tested with Node v20.1.0
     - The appropriate pnpm version is listed under the "packageManager key in [`package.json`](./package.json)
     - If you have any issues while installing dependencies with pnpm you can try to use `corepack` to make sure you use correct version of pnpm.
       - `corepack enable`
       - `corepack pnpm install`
2. **Run `make setup`**
3. Run contract tests for basic sanity testing:
   - `(cd packages/contracts && make test)`

## IDEs

If you're using Visual Studio Code, the contract remappings will only be picked up if you set the
root of the project to the `contracts` package. Otherwise, you'll add to manually add the remappings
(from `remappings.txt`) to the Solidity plugin configuration.

## Running

To deploy and try out the app run the following commands (`anvil` and `webdev` will keep running and
must be run in their own terminal):

```shell
make anvil
make deploy
make webdev
```

This will do the following:

- Run anvil (local EVM node) at localhost:8545 with chain ID 1337
  (this chain comes preconfigured in Metamask and other wallets as "Localhost")
- Run the NextJS dev command (web server + live reload)
- Deploy the contracts to the local node

After that, you can visit the app at http://localhost:3000/ (if that port is already occupied,
NextJS might affect another one).

**Common caveat**: Every time you restart Anvil, you might have to perform some kind of reset in
your wallet. With Metamask, that's "..." > "Settings" > "Advanced" > "Clear activity and nonce
data".

## Commands

See the [Makefile](/Makefile) for a description of all top-level make commands.
