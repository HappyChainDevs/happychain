# HappyChain Monorepo

HappyChain is a blockchain focused on fully onchain game.

Our flagship feature is the Happy Account, a global account for all applications on HappyChain,
implemented via a wallet that can be permissionlessly embedded into any app.

The Happy Account enabling secure asset self-custody and transaction signing via an EIP-4337 smart
account controlled by private key, either derived from a social account (Google, Twitter, Discord,
...) + seamless 2FA, or via a traditional wallet extension (Metamask, Rabby, etc).

## Installation

1. Install pre-requisite tooling:
    - Make
    - [Foundry](https://github.com/foundry-rs/foundry)
    - Node.js & [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
        - Tested with Node v22.8.0 and pnpm 9.7.0, but should work with other versions as well
        - The appropriate pnpm version is listed under the "packageManager key in [`package.json`](./package.json)
        - We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions.
    - [bun](https://bun.sh/) to run tests
2. **Run `make setup`**

## Lifecycle

You can run `make help` to get a short description of the most common commands.

- `make setup` — don't forget to run this before anything else, or when dependencies change!
- `make build` — builds all packages
- `make docs` — build the docs package and opens and serves them on http://localhost:4173
  - Requires running `make build` first.
  - This is different from architecture docs, which are in [/docs](/docs).
- `make check` — runs code quality & formatting checks
- `make format` — formats code and tries to fix code quality issues
- `make clean` — removes all build artifacts
- `make nuke` — removes all build artifacts and dependencies
  - you need to rerun `make setup` after this

Most package have a version of `make build`, `make clean`, `make check` and `make format`.

Some packages have their own `make setup` — when that is the case, it does **not** install the pnpm
dependencies (so that not time is wasted doing this after installing everything once at the top
level).

## Development & Running Demos

- `make {sdk,iframe,demos,ts,docs,contracts}.{build,clean,check,format}`
  - This runs the specified command (after the dot) in a subset of packages.
  - `sdk`: all packages needed to build the sdk
  - `iframe`: all packages needed to build the iframe
  - `demos`: all demo packages (no dependencies)
  - `ts`: all typescript packages

- make {sdk,iframe,account,demo-js,demo-react,demo-vue}.dev
  - This builds, rebuilds on changes, and runs development servers (where applicable) for
    a subset of packages.
  - If you have [`mprocs`] isntalled, you can specify `MULTIRUN=mprocs` to run with mprocs instead.
  - `sdk`: all packages needed to build the sdk
  - `iframe`: all packages needed to build the iframe
  - `account`: all package needed for the Happy Account (sdk + iframe)
  - `demo-js`: everything needed for the vanilla JS demo (account + demo-vanillajs)
  - `demo-react`: everything needed for the React demo (account + demo-react)
  - `demo-vue`: everything needed for the Vue demo (account + demo-wagmi-vue)
  - The `demo-*` targets will let you access the demo on your browser
    (look for the URL in the terminal)

[`mprocs`]: https://github.com/pvolok/mprocs

## More Commands

See the [Makefile](/Makefile) for a description of all top-level make commands.
