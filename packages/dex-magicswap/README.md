# @happychain/dex

Magicswap V2 fork.

## Tech Stack

- [Remix](https://remix.run)
- [Tailwind CSS](https://tailwindcss.com)
- [Graph Client Tools](https://github.com/graphprotocol/graph-client)
- [wagmi](https://wagmi.sh)
- [shadcdn/ui](https://ui.shadcn.com/docs)
- Deployment on [fly.io](https://fly.io)

## Pre-requisites

- Get a [Thirdweb API key](https://thirdweb.com/dashboard) ;
- Get a [Walletconnect/Reown project ID](https://cloud.reown.com/app) ;

## Local Development

Check out the repo and install dependencies in the root folder:

```sh
bun install
```

Create your environment variables file:

```
MAGICSWAPV2_API_URL=
PUBLIC_CHAIN_ID=421614
PUBLIC_THIRDWEB_CLIENT_ID=
PUBLIC_WALLET_CONNECT_PROJECT_ID=
# You can ignore this one, we're "mocking" API calls
TROVE_API_KEY=
```

Fill in relevant environment variables and run code generation:

```sh
bun generate
```

Start application:

```sh
bun dev
```
