export interface Token {
  name: string;
  symbol: string;
  balance: string;
}

export interface AppGame {
  name: string;
  imageUrl: string;
}

// placeholder lists
export const tokenList: Token[] = [
  {
    name: "TestFoo",
    symbol: "FOO",
    balance: "20.56",
  },
  {
    name: "TestBar",
    symbol: "BAR",
    balance: "2000",
  },
];

export const appList: AppGame[] = [
  { name: "0xFable", imageUrl: "" },
  { name: "HappyPunch", imageUrl: "" },
];
