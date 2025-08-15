import { ethers } from "ethers";
import { PROVIDER_KEY } from "../constants/contract";

// Minimal ABI with just the `decimals` function
const erc20Abi = ["function decimals() view returns (uint8)"];

// Cache decimals to avoid repeat calls
const decimalsCache: { [address: string]: number } = {};

// Stable provider instance
const provider = new ethers.JsonRpcProvider(PROVIDER_KEY);

const FIXED_DECIMALS: Record<string, number> = {
  // EURC (case-insensitive check)
  "0x08210f9170f89ab7658f0b5e3ff39b0e03c594d4": 6,
  // LINK
  "0x6641415a61bce80d97a715054d1334360ab833eb": 18,
};

/**
 * Get decimals for a given token address.
 * caching to avoid redundant RPC calls.
 */
export async function getTokenDecimals(tokenAddress?: string): Promise<number> {
  if (!tokenAddress) throw new Error("Token address is required");

  const addressKey = tokenAddress.toLowerCase();

  // If it's a fixed-decimal token
  if (addressKey in FIXED_DECIMALS) {
    return FIXED_DECIMALS[addressKey];
  }

  // Return from cache if available
  if (decimalsCache[addressKey] !== undefined) {
    return decimalsCache[addressKey];
  }

  try {
    const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    const decimals: number = await contract.decimals();
    decimalsCache[addressKey] = decimals;
    return decimals;
  } catch (err) {
    console.error(`Failed to fetch token decimals for ${tokenAddress}:`, err);
    throw new Error("Could not fetch decimals");
  }
}

/**
 * Format a raw BigInt token amount using token's decimals.
 */
export async function formatTokenAmount(
  tokenAddress: string,
  amount: bigint
): Promise<string> {
  const decimals = await getTokenDecimals(tokenAddress);
  return ethers.formatUnits(amount, decimals);
}
