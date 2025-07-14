import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, mainnet } from "wagmi/chains";
import { http } from "viem";

export const config = getDefaultConfig({
  appName: "Micro-Lending",
  projectId: "DeFi",
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(
      "https://eth-mainnet.g.alchemy.com/v2/A1NzYyo3iFc9q1UTZw1Z7EkIpVlbEKHQ"
    ),
    [sepolia.id]: http(
      "https://eth-sepolia.g.alchemy.com/v2/A1NzYyo3iFc9q1UTZw1Z7EkIpVlbEKHQ" //Alchemy API Keys
    ),
  },
  ssr: false, // Important for Vite compatibility
});

export default config;
