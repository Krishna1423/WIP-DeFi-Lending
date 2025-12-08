import contractABI from "../abi/DeFi.json";

export const CONTRACT_ADDRESS = "0x30ae3e2Fa63c4034bE95b072A4fa23A90373d3eA";
export const CONTRACT_ABI = contractABI;
export const PROVIDER_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;

if (!PROVIDER_KEY) {
  throw new Error(
    "VITE_ALCHEMY_API_KEY is not set. Please create a .env.local file with your Alchemy API key."
  );
}
