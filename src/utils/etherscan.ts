import { ETHERSCAN_API_KEY } from "../constants/contract";
import axios from "axios";

const ETHERSCAN_API_BASE = "https://api-sepolia.etherscan.io/api";

export async function fetchLoanRequestedLogs(
  contractAddress: string,
  fromBlock: number,
  toBlock: number,
  borrowerAddress?: string
) {
  const topic0 =
    "0x8e783775b8f0ef5621f920c7aad6e930f859444359557ce252ef568f9b368ddc"; // LoanRequested event topic

  const params: any = {
    module: "logs",
    action: "getLogs",
    chainid: 11155111,
    address: contractAddress,
    fromBlock: fromBlock,
    toBlock: toBlock,
    topic0: topic0,
    apikey: ETHERSCAN_API_KEY,
  };

  if (borrowerAddress) {
    params.topic1 =
      "0x" + borrowerAddress.toLowerCase().replace("0x", "").padStart(64, "0");
  }

  const res = await axios.get(ETHERSCAN_API_BASE, { params });

  if (res.data.status !== "1") {
    console.warn("No events found or Etherscan error:", res.data.message);
    return [];
  }

  return res.data.result;
}

export async function fetchLoanRepaidLogs(
  contractAddress: string,
  fromBlock: number,
  toBlock: number,
  borrowerAddress?: string
) {
  const topic0 =
    "0x1322aa420451d1cdbb2ef201af21dd33065fe0bb0bd9f3f01740aa3117629c17"; // LoanRepaid event topic

  const params: any = {
    module: "logs",
    action: "getLogs",
    chainid: 11155111,
    address: contractAddress,
    fromBlock: fromBlock,
    toBlock: toBlock,
    topic0: topic0,
    apikey: ETHERSCAN_API_KEY,
  };

  if (borrowerAddress) {
    params.topic1 =
      "0x" + borrowerAddress.toLowerCase().replace("0x", "").padStart(64, "0");
  }

  const res = await axios.get(ETHERSCAN_API_BASE, { params });

  if (res.data.status !== "1") {
    console.warn("No events found or Etherscan error:", res.data.message);
    return [];
  }

  return res.data.result;
}
