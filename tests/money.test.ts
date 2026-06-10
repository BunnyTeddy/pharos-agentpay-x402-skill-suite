import { describe, expect, it } from "vitest";
import { atomicUnitsToUsdString, isWithinMaxUsd, usdToAtomicUnits } from "../src/money.js";

describe("USDC money helpers", () => {
  it("converts USD display amounts to 6-decimal atomic units", () => {
    expect(usdToAtomicUnits("0.001")).toBe("1000");
    expect(usdToAtomicUnits("$0.01")).toBe("10000");
    expect(usdToAtomicUnits(1)).toBe("1000000");
  });

  it("formats and checks max USD guards", () => {
    expect(atomicUnitsToUsdString("5000")).toBe("0.005");
    expect(isWithinMaxUsd("5000", 0.01)).toBe(true);
    expect(isWithinMaxUsd("50000", 0.01)).toBe(false);
  });
});
