# HappyChain Monorepo

HappyChain is a blockchain focused on fully onchain gaming.

Our flagship feature is the Happy Account, a global account for all applications on HappyChain,
implemented via a wallet that can be permissionlessly embedded into any app.

The Happy Account enables secure asset self-custody and transaction signing via an EIP-4337 smart
account controlled by private key, either derived from a social account (Google, Twitter,
Discord, ...) + seamless 2FA, or via a traditional wallet extension (Metamask, Rabby, etc).

## Installation

1. Install pre-requisite tooling:
    - Make
    - [Foundry](https://github.com/foundry-rs/foundry)
    - [Bun](https://bun.sh/)
    - Node.js 23.6+
        - We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions.
    - [pnpm](https://pnpm.io/)
        - This is only needed to build the bundler.

2. **Run `make setup`**

## Lifecycle

You can run `make help` to get a short description of the most common commands.

- `make setup` — don't forget to run this before anything else, or when dependencies change!
- `make build` — builds all packages
- `make docs` — build and serves the documentation on <http://localhost:4173>.
  - This is different from architecture docs, which are in [/docs](/docs).
- `make check` — runs code quality & formatting checks
- `make format` — formats code and tries to fix code quality issues
- `make clean` — removes all build artifacts
- `make nuke` — removes all build artifacts and dependencies

Most packages have a version of `make build`, `make clean`, `make check` and `make format`.

## Development & Running Demos

- `make {sdk,iframe,account,demos,ts,docs,contracts}.{build,clean,check,format}`
  - This runs the specified command (after the dot) in a subset of the packages.
  - `sdk`: all packages needed to build the sdk
  - `iframe`: all packages needed to build the iframe
  - `account`: sdk + iframe
  - `demos`: all demo packages (no dependencies)
  - `ts`: all typescript packages (excluding docs)
  - `docs`: the documentation site
  - `contracts`: the smart contracts

- `make {sdk,iframe,demo-js,demo-react,demo-vue,docs}.dev`
  - This builds, rebuilds on changes, and runs development servers (where applicable) for
    a subset of packages.
  - `sdk`: all packages needed to build the sdk
  - `iframe`: all packages needed to build the iframe
  - `demo-js`: everything needed for the vanilla JS demo (account + demo-vanillajs)
  - `demo-react`: everything needed for the React demo (account + demo-react)
  - `demo-vue`: everything needed for the Vue demo (account + demo-wagmi-vue)
  - The `demo-*` targets will let you access the demo on your browser
    (look for the URL in the terminal)

- `make {demo-js,demo-react,demo-vue}.build`
  - Builds the production version of the specified demo locally.

- `make {demo-js,demo-react,demo-vue}.prod`
  - Builds & run the production version of the specified demo locally.

By default [`concurrently`](https://github.com/open-cli-tools/concurrently) is used to run multiple processes at once. If preferred, you can install [`mprocs`](https://github.com/pvolok/mprocs) globally on your system and set the env variable `MULTIRUN=mprocs` to use this instead.

## More Commands

See the [Makefile](/Makefile) for descriptions of all top-level make commands.
