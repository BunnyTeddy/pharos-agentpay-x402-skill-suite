const TEN = 10n;

export function usdToAtomicUnits(value: string | number, decimals = 6): string {
  const normalized = String(value).trim().replace(/^\$/, "");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid USD amount: ${value}`);
  }

  const [whole, fraction = ""] = normalized.split(".");
  const base = TEN ** BigInt(decimals);
  const padded = (fraction + "0".repeat(decimals)).slice(0, decimals);
  return (BigInt(whole) * base + BigInt(padded || "0")).toString();
}

export function atomicUnitsToUsdNumber(value: string | bigint, decimals = 6): number {
  return Number(BigInt(value)) / 10 ** decimals;
}

export function atomicUnitsToUsdString(value: string | bigint, decimals = 6): string {
  const atomic = BigInt(value);
  const base = TEN ** BigInt(decimals);
  const whole = atomic / base;
  const fraction = (atomic % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function isWithinMaxUsd(atomicAmount: string, maxUsd: number, decimals = 6): boolean {
  return atomicUnitsToUsdNumber(atomicAmount, decimals) <= maxUsd;
}
