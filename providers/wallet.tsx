import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, mainnet } from "wagmi/chains";
import { http } from "viem";

export const config = getDefaultConfig({
  appName: "Micro-Lending",
  projectId: "DeFi",
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(import.meta.env.VITE_ALCHEMY_API_KEY),
  },
  ssr: false, // Important for Vite compatibility
});

export default config;
