import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { PROVIDER_KEY } from "../constants/contract";

// Minimal ABI with just the `decimals` function
const erc20Abi = ["function decimals() view returns (uint8)"];

export function useTokenDecimals(tokenAddress?: string) {
  const provider = new ethers.JsonRpcProvider(PROVIDER_KEY);
  const [decimals, setDecimals] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenAddress || !provider) return;

    const fetchDecimals = async () => {
      if (tokenAddress == "0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4") {
        setDecimals(6);
        return;
      } else {
        try {
          const addressKey = tokenAddress.toLowerCase();
          console.log("Token address", addressKey, tokenAddress);
          const contract = new ethers.Contract(
            tokenAddress,
            erc20Abi,
            provider
          );
          const value: number = await contract.decimals();
          setDecimals(value);
        } catch (err) {
          console.error("Failed to fetch token decimals:", err);
          setError("Could not fetch decimals");
        }
      }
    };

    fetchDecimals();
  }, [tokenAddress, provider]);

  return { decimals, error };
}

// cache decimals to avoid repeat calls
const decimalsCache: { [address: string]: number } = {};

export async function getFormattedAmount(
  tokenAddress: string,
  amount: bigint
): Promise<string> {
  const addressKey = tokenAddress.toLowerCase();
  if (tokenAddress == "0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4")
    return ethers.formatUnits(amount, 6);
  const provider = new ethers.JsonRpcProvider(PROVIDER_KEY);
  if (!decimalsCache[tokenAddress]) {
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    decimalsCache[tokenAddress] = await tokenContract.decimals();
  }

  const decimals = decimalsCache[tokenAddress];
  return ethers.formatUnits(amount, decimals);
}
