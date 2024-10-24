# Magicswap v2 UI

> A novel permissionless AMM with universal token compatibility tailored for games.

[Magicswap](https://magicswap.lol) is a permissionless AMM that provides universal token compatibility and allows users to pool any kind of NFT together and trade them like you would on AMMs like Uniswap. Users never touch underlying vault tokens, and handle only NFTs directly, simplifying the whole experience. Users can create pools for any combination of ERC-20s, ERC-721s, and ERC-1155s. Pools can include multiple vault token types and are compatible with new token standards in the future.

Built for and governed by the [Treasure ecosystem](https://treasure.lol).

Supporting repositories:

- [Smart Contracts](https://github.com/TreasureProject/magicswapv2-contracts)
- [Subgraph](https://github.com/TreasureProject/treasure-subgraphs/tree/master/subgraphs/magicswapv2)

## Tech Stack

- [Remix](https://remix.run)
- [Tailwind CSS](https://tailwindcss.com)
- [Graph Client Tools](https://github.com/graphprotocol/graph-client)
- [wagmi](https://wagmi.sh)
- [shadcdn/ui](https://ui.shadcn.com/docs)
- Deployment on [fly.io](https://fly.io)

## Local Development

Check out the repo and install dependencies in the root folder:

```sh
npm install
```

Create environment variable file:

```sh
cp .env.sample .env
```

Fill in relevant environment variables and run code generation:

```sh
npm run generate
```

Start application:

```sh
npm run dev
```
