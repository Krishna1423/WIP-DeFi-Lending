import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  PROVIDER_KEY,
} from "../constants/contract";
import { useTokenDecimals } from "../hooks/useTokenDecimals";
import {
  fetchLoanRequestedLogs,
  fetchLoanRepaidLogs,
} from "../utils/etherscan";

interface Transaction {
  type: string;
  amount: string;
  direction: "in" | "out";
  timestamp: number | null;
}

interface Props {
  userAddress?: `0x${string}`;
}

// Util: Find the block number when the contract was deployed
const findDeploymentBlock = async (
  provider: ethers.JsonRpcProvider,
  contractAddress: string
): Promise<number> => {
  const code = await provider.getCode(contractAddress);
  if (!code || code === "0x") {
    throw new Error("Contract not found or not yet deployed");
  }

  let low = 0;
  let high = await provider.getBlockNumber();
  let deploymentBlock = high;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const codeAtMid = await provider.getCode(contractAddress, mid);

    if (codeAtMid && codeAtMid !== "0x") {
      deploymentBlock = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return deploymentBlock;
};

const TransactionHistory = ({ userAddress }: Props) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userAddress || !window.ethereum) return;

      const provider = new ethers.JsonRpcProvider(PROVIDER_KEY);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );
      const txs: Transaction[] = [];

      try {
        const deploymentBlock = await findDeploymentBlock(
          provider,
          CONTRACT_ADDRESS
        );
        const latestBlock = await provider.getBlockNumber();

        // Fetch LoanRequested logs
        const loanRequestedLogs = await fetchLoanRequestedLogs(
          CONTRACT_ADDRESS,
          deploymentBlock,
          latestBlock,
          userAddress
        );

        for (const log of loanRequestedLogs) {
          const loanId = BigInt(log.topics[2]); // loanId indexed
          const blockNumber = Number(log.blockNumber);
          const loan = await contract.getLoanDetails(loanId);

          const { decimals: loanDecimals } = useTokenDecimals(loan.loanToken);
          const amount = ethers.formatUnits(loan.loanAmount, loanDecimals);

          const { decimals: collateralDecimals } = useTokenDecimals(
            loan.collateralToken
          );
          const collateral = ethers.formatUnits(
            loan.collateralAmount,
            collateralDecimals
          );

          const block = await provider.getBlock(blockNumber);
          const timestamp = block?.timestamp || null;

          txs.push({
            type: "Loan Requested",
            amount,
            direction: "out",
            timestamp,
          });
          txs.push({
            type: "Collateral Deposited",
            amount: collateral,
            direction: "out",
            timestamp,
          });
        }

        // Fetch LoanRepaid logs
        const loanRepaidLogs = await fetchLoanRepaidLogs(
          CONTRACT_ADDRESS,
          deploymentBlock,
          latestBlock,
          userAddress
        );

        for (const log of loanRepaidLogs) {
          const loanId = BigInt(log.topics[2]);
          const blockNumber = Number(log.blockNumber);
          const loan = await contract.getLoanDetails(loanId);

          if (loan.borrower.toLowerCase() !== userAddress.toLowerCase())
            continue;

          const { decimals: loanDecimals } = useTokenDecimals(loan.loanToken);
          const parsedAmount = ethers.formatUnits(
            loan.loanAmount,
            loanDecimals
          );

          const block = await provider.getBlock(blockNumber);
          const timestamp = block?.timestamp || null;

          txs.push({
            type: "Loan Repaid",
            amount: parsedAmount,
            direction: "in",
            timestamp,
          });
        }

        const sorted = txs.sort(
          (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
        );
        setTransactions(sorted);
      } catch (err) {
        console.error("Transaction fetch error:", err);
      }
    };

    fetchTransactions();
  }, [userAddress]);

  return (
    <div>
      <h4 className="font-medium mb-2">Recent Transactions</h4>
      {transactions.length === 0 ? (
        <p className="text-gray-500">No recent transactions.</p>
      ) : (
        <ul className="space-y-2">
          {transactions.map((tx, index) => (
            <li key={index} className="flex justify-between text-sm">
              <span>{tx.type}</span>
              <span
                className={
                  tx.direction === "in" ? "text-green-600" : "text-red-600"
                }
              >
                {tx.direction === "in" ? "+" : "-"}${tx.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TransactionHistory;
