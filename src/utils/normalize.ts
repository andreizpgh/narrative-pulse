/**
 * Normalize a blockchain address for consistent lookup.
 * EVM addresses (0x-prefixed) are lowercased.
 * Solana and other non-EVM addresses are kept as-is (case-sensitive).
 */
export function normalizeAddress(address: string): string {
  if (address.startsWith("0x") || address.startsWith("0X")) {
    return address.toLowerCase();
  }
  return address;
}
