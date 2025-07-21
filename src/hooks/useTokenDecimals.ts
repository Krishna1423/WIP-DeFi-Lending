import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useEthersProvider } from "./useEthersProvider";

// Minimal ABI with just the `decimals` function
const erc20Abi = ["function decimals() view returns (uint8)"];

export function useTokenDecimals(tokenAddress?: string) {
  const provider = useEthersProvider();
  const [decimals, setDecimals] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenAddress || !provider) return;

    const fetchDecimals = async () => {
      try {
        const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
        const value: number = await contract.decimals();
        setDecimals(value);
      } catch (err) {
        console.error("Failed to fetch token decimals:", err);
        setError("Could not fetch decimals");
      }
    };

    fetchDecimals();
  }, [tokenAddress, provider]);

  return { decimals, error };
}
