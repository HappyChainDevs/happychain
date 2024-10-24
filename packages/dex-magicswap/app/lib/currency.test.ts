import { describe, expect, it } from "vitest";

import { formatAmount } from "./currency";

describe("currency utils", () => {
  it("formats amounts", () => {
    expect(formatAmount("123456789.9999")).toBe("123,456,789.99");
    expect(formatAmount("123456.9999")).toBe("123,456.99");
    expect(formatAmount("12345.9999")).toBe("12,345.99");
    expect(formatAmount("1234.9999")).toBe("1,234.99");
    expect(formatAmount("123.9999")).toBe("123.99");
    expect(formatAmount("12.9999")).toBe("12.999");
    expect(formatAmount("1.9999")).toBe("1.999");
    expect(formatAmount("1")).toBe("1");
    expect(formatAmount("0.9999")).toBe("0.9999");
    expect(formatAmount("0.000999")).toBe("0.000999");
    expect(formatAmount("0.00000999")).toBe("0.000009");
    expect(formatAmount(123456789990000000000000000n)).toBe("123,456,789.99");
    expect(formatAmount(123456000000000000000n)).toBe("123.45");
    expect(formatAmount(1000000000000000000n)).toBe("1");
    expect(formatAmount(123456780000000n)).toBe("0.000123");
    expect(formatAmount("123456789.9999", { type: "compact" })).toBe("123.46M");
    expect(formatAmount("123456.9999", { type: "compact" })).toBe("123.46K");
    expect(formatAmount("12345.9999", { type: "compact" })).toBe("12.35K");
    expect(formatAmount("1234.9999", { type: "compact" })).toBe("1.23K");
    expect(formatAmount("123.9999", { type: "compact" })).toBe("123.99");
    expect(formatAmount("123456789.9999", { type: "raw" })).toBe(
      "123456789.99",
    );
    expect(formatAmount("123456.9999", { type: "raw" })).toBe("123456.99");
    expect(formatAmount("12345.9999", { type: "raw" })).toBe("12345.99");
    expect(formatAmount("1234.9999", { type: "raw" })).toBe("1234.99");
    expect(formatAmount("123.9999", { type: "raw" })).toBe("123.99");
  });
});
