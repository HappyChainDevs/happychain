import { expect, test } from "vitest";

import { countTokens } from "./tokens";

const TEST_TOKEN = {
  collectionAddr: "0x0",
  tokenId: "1",
  collectionUrlSlug: "test-collection",
  image: {
    uri: "",
  },
  metadata: {
    name: "Test Collection",
    attributes: [],
  },
};

test("counts tokens with quantity", () => {
  expect(
    countTokens([
      {
        ...TEST_TOKEN,
        contractType: "ERC1155",
        queryUserQuantityOwned: 10,
        quantity: 1,
      },
      {
        ...TEST_TOKEN,
        contractType: "ERC1155",
        queryUserQuantityOwned: 20,
        quantity: 5,
      },
    ]),
  ).toBe(6);
});
