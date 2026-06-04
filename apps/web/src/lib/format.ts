import { formatEther, formatUnits, type Address } from "viem";

export function shortAddress(address?: string) {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function sameAddress(a?: string, b?: string) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

export function formatEth(value?: bigint) {
  if (value === undefined) {
    return "0 ETH";
  }

  const formatted = Number(formatEther(value));
  return `${formatted.toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH`;
}

export function formatToken(value?: bigint, decimals = 18) {
  if (value === undefined) {
    return "0";
  }

  const formatted = Number(formatUnits(value, decimals));
  return formatted.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function formatDate(timestamp?: bigint | number) {
  if (timestamp === undefined) {
    return "Unknown";
  }

  const seconds = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return new Date(seconds * 1000).toLocaleString();
}

export function asAddress(value: unknown): Address {
  return value as Address;
}

export const escrowStatusLabels = ["Open", "Submitted", "Approved", "Claimed", "Refunded", "Cancelled"];
