import { arbitrum, arbitrumSepolia } from "viem/chains";

export const PRIVACY_POLICY_URL = "https://app.treasure.lol/privacy-policy";
export const TERMS_OF_SERVICE_URL = "https://app.treasure.lol/terms-of-service";

export const DOCS_URL = "https://docs.treasure.lol/magicswap";
export const GOVERNANCE_FORUM_URL =
  "https://forum.treasure.lol/discussions/3.1.%20Magicswap%20-%20Active";
export const BUY_MAGIC_URL = "https://market.treasure.lol/manage-funds";

export const DISCORD_URL = "https://discord.com/invite/treasuredao";
export const TWITTER_URL = "https://twitter.com/MagicSwap_";

export const TOKEN_METADATA = {
  [arbitrum.id]: [
    {
      id: "0x539bde0d7dbd336b79148aa742883198bbf60342",
      name: "MAGIC",
      symbol: "MAGIC",
      image: "/img/tokens/magic.png",
      isMAGIC: true,
    },
    {
      id: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
      name: "Ether",
      symbol: "ETH",
      image: "/img/tokens/eth.png",
      isETH: true,
    },
    {
      id: "0xccd05a0fcfc1380e9da27862adb2198e58e0d66f",
      name: "Anima",
      symbol: "ANIMA",
      image: "/img/tokens/anima.png",
    },
    {
      id: "0xeeac5e75216571773c0064b3b591a86253791db6",
      name: "Ellerium",
      symbol: "ELM",
      image: "/img/tokens/elm.png",
    },
    {
      id: "0x872bad41cfc8ba731f811fea8b2d0b9fd6369585",
      name: "gFLY",
      symbol: "GFLY",
      image: "/img/tokens/gfly.png",
    },
    {
      id: "0x9e64d3b9e8ec387a9a58ced80b71ed815f8d82b5",
      name: "Smolcoin",
      symbol: "SMOL",
      image: "/img/tokens/smol.png",
    },
    {
      id: "0x0caadd427a6feb5b5fc1137eb05aa7ddd9c08ce9",
      name: "VEE",
      symbol: "VEE",
      image: "/img/tokens/vee.png",
    },
    {
      id: "0x74abf11b5f7bf057000e411a7130b46911792709",
      name: "Heist Rewards Token",
      symbol: "HRT",
      image: "/img/tokens/hrt.png",
    },
  ],
  [arbitrumSepolia.id]: [
    {
      id: "0x55d0cf68a1afe0932aff6f36c87efa703508191c",
      name: "MAGIC",
      symbol: "MAGIC",
      image: "/img/tokens/magic.png",
      isMAGIC: true,
    },
    {
      id: "0x980b62da83eff3d4576c647993b0c1d7faf17c73",
      name: "Ether",
      symbol: "ETH",
      image: "/img/tokens/eth.png",
      isETH: true,
    },
    {
      id: "0xda3cad5e4f40062ceca6c1b979766bc0baed8e33",
      name: "Ellerium",
      symbol: "ELM",
      image: "/img/tokens/elm.png",
    },
    {
      id: "0xff095e7d5a51d268f17ed77c32a62669782868ba",
      name: "gFLY",
      symbol: "GFLY",
      image: "/img/tokens/gfly.png",
    },
    {
      id: "0x568b900f596c183e68fe9d773a7afb93156c9db3",
      name: "Smolcoin",
      symbol: "SMOL",
      image: "/img/tokens/smol.png",
    },
    {
      id: "0x23be0504127475387a459fe4b01e54f1e336ffae",
      name: "VEE",
      symbol: "VEE",
      image: "/img/tokens/vee.png",
    },
    {
      id: "0x5a3247e764ee0e71cef22802d189815fad6f1257",
      name: "Heist Rewards Token",
      symbol: "HRT",
      image: "/img/tokens/hrt.png",
    },
  ],
} as const;

export const GAME_METADATA: Record<
  string,
  {
    name: string;
    image: string;
    tokens: Record<number, string[]>;
    collections: Record<number, string[]>;
  }
> = {
  bitmates: {
    name: "Bitmates",
    image: "/img/games/bitmates.png",
    tokens: {},
    collections: {
      [arbitrumSepolia.id]: ["0x7e0ac4fd9ce457c4dfc903804d96b1eb5a34000e"],
    },
  },
  realm: {
    name: "Realm",
    image: "/img/games/realm.png",
    tokens: {
      [arbitrum.id]: ["0xccd05a0fcfc1380e9da27862adb2198e58e0d66f"],
    },
    collections: {},
  },
  smol: {
    name: "SMOL",
    image: "/img/games/smol.png",
    tokens: {
      [arbitrum.id]: ["0x9e64d3b9e8ec387a9a58ced80b71ed815f8d82b5"],
      [arbitrumSepolia.id]: ["0x568b900f596c183e68fe9d773a7afb93156c9db3"],
    },
    collections: {},
  },
  zeeverse: {
    name: "Zeeverse",
    image: "/img/games/zeeverse.png",
    tokens: {
      [arbitrum.id]: [
        "0x0caadd427a6feb5b5fc1137eb05aa7ddd9c08ce9",
        "0x74abf11b5f7bf057000e411a7130b46911792709",
      ],
      [arbitrumSepolia.id]: [
        "0x23be0504127475387a459fe4b01e54f1e336ffae",
        "0x5a3247e764ee0e71cef22802d189815fad6f1257",
      ],
    },
    collections: {
      [arbitrum.id]: ["0x58318bceaa0d249b62fad57d134da7475e551b47"],
      [arbitrumSepolia.id]: ["0xfaad5aa3209ab1b25ede22ed4da5521538b649fa"],
    },
  },
};

export const BLOCKED_PAIRS = [
  "0xf904469497e6a179a9d47a7b468e4be42ec56e65", // MAGIC-ELM v1
];

export const BLOCKED_TOKENS = [
  "0x45d55eadf0ed5495b369e040af0717eafae3b731", // ELM v1
];
