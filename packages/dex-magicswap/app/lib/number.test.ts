import { describe, expect, it } from "vitest";

import { ceilBigInt, floorBigInt } from "./number";

describe("number utils", () => {
  it("floors bigints", () => {
    expect(floorBigInt(1000000000000000000n)).toBe(1000000000000000000n);
    expect(floorBigInt(1700000000000000000n)).toBe(1000000000000000000n);
    expect(floorBigInt(1700000n, 6)).toBe(1000000n);
  });

  it("ceils bigints", () => {
    expect(ceilBigInt(1000000000000000000n)).toBe(1000000000000000000n);
    expect(ceilBigInt(1700000000000000000n)).toBe(2000000000000000000n);
    expect(ceilBigInt(1700000n, 6)).toBe(2000000n);
  });
});
