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

## Running The Demos

After `make setup` and `make build, you can run the demos with the following commands:

- `make demo-vanillajs`
- `make demo-react`
- `make demo-wagmi-vue`

Alternatively, run `make iframe.dev` in a terminal, then:

- `make demo-vanillajs.dev`
- `make demo-react.dev`
- `make demo-wagmi-vue.dev`

## More Commands

See the [Makefile](/Makefile) for a description of all top-level make commands.
