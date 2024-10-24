import { expect, test } from "vitest";

import { getAmountMin, getLpCountForTokens, quote } from "./pools";

test("quotes token in another currency", () => {
  expect(quote(1000000000000000000n, 0n, 29250623088211647000000n)).toBe(0n);
  expect(
    quote(
      1000000000000000000n,
      49000000000000000000n,
      29250623088211647000000n,
    ),
  ).toBe(596951491596156061224n);
});

test("generates LP count for tokens", () => {
  expect(
    getLpCountForTokens(
      1000000000000000000n,
      5000000000000000000n,
      100000000000000000000n,
    ),
  ).toBe(20000000000000000000n);
});

test("generates min amount based on slippage", () => {
  expect(getAmountMin(1000000000000000000n, 0.005)).toBe(995000000000000000n);
});
