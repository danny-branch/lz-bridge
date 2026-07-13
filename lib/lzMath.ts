import { pad } from "viem";

// Sharp edge from the skill: minAmountLD must be amountLD truncated to shared-decimal
// precision, computed with BigInt — never hand-truncate digits.
// minAmountLD = amountLD - (amountLD % 10^(localDecimals - sharedDecimals))
export function computeMinAmountLD(
  amountLD: bigint,
  localDecimals: number,
  sharedDecimals: number
): bigint {
  const diff = localDecimals - sharedDecimals;
  if (diff <= 0) return amountLD;
  const dust = 10n ** BigInt(diff);
  return amountLD - (amountLD % dust);
}

export function addressToBytes32(address: `0x${string}`): `0x${string}` {
  return pad(address, { size: 32 });
}

export function bytes32ToAddress(b: `0x${string}`): `0x${string}` {
  return `0x${b.slice(-40)}` as `0x${string}`;
}

export function parseAmount(input: string, decimals: number): bigint {
  const trimmed = input.trim();
  if (!trimmed) return 0n;
  const [whole, frac = ""] = trimmed.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const cleanWhole = whole.replace(/[^0-9]/g, "") || "0";
  return BigInt(cleanWhole) * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}

export function formatAmount(amount: bigint, decimals: number, maxFractionDigits = 6): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const frac = amount % divisor;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, maxFractionDigits).replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}
