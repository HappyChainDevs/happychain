export interface Token {
  name: string;
  symbol: string;
  imageUrl: string;
  balance: string;
}

export interface AppGame {
  name: string;
  imageUrl: string;
}

export const tokenList: Token[] = [
  {
    name: "Ethereum",
    symbol: "ETH",
    imageUrl:
      "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    balance: "20.56",
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    imageUrl:
      "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
    balance: "2000",
  },
];

export const appList: AppGame[] = [
  { name: "0xFable", imageUrl: "" },
  { name: "HappyPunch", imageUrl: "" },
];
