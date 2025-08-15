import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  PROVIDER_KEY,
} from "../constants/contract";
import { tokenNameMap } from "../constants/tokens";
import { getTokenDecimals } from "../utils/useTokenDecimals";

interface Transaction {
  type: string;
  amount: string;
  token: string;
  direction: "in" | "out";
  timestamp: number | null;
}

interface Props {
  userAddress?: `0x${string}`;
}

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
        const userLoans: any[] = await contract.getLoansByUser(userAddress);

        for (const loan of userLoans) {
          const creationTime = loan.timestamp ? Number(loan.timestamp) : null;

          const loanTokenAddr = String(loan.loanToken).toLowerCase();
          const collateralTokenAddr = String(
            loan.collateralToken
          ).toLowerCase();

          const loanTokenName =
            tokenNameMap[loanTokenAddr] || loanTokenAddr.slice(0, 6);
          const collateralTokenName =
            tokenNameMap[collateralTokenAddr] ||
            collateralTokenAddr.slice(0, 6);

          const loanDecimals = await getTokenDecimals(loan.loanToken);
          const collateralDecimals = await getTokenDecimals(
            loan.collateralToken
          );

          const loanAmount = ethers.formatUnits(loan.loanAmount, loanDecimals);
          const collateralAmount = ethers.formatUnits(
            loan.collateralAmount,
            collateralDecimals
          );

          // Collateral Deposited (always when loan created)
          txs.push({
            type: "Collateral Deposited",
            amount: collateralAmount,
            token: collateralTokenName,
            direction: "out",
            timestamp: creationTime,
          });

          // Loan Funded (status = 1 or repaid = 2 means it was funded at some point)
          if (Number(loan.status) === 1) {
            const filterFunded = contract.filters.LoanFunded(loan.loanId);
            const latestBlock = await provider.getBlockNumber();
            const fromBlock = latestBlock - 499;
            const eventsFunded = await contract.queryFilter(
              filterFunded,
              fromBlock,
              latestBlock
            );
            if (eventsFunded.length > 0) {
              const evtFunded = eventsFunded[eventsFunded.length - 1];
              const args =
                (evtFunded as any).args ||
                contract.interface.parseLog(evtFunded)?.args;
              const fundedTime = args?.timestamp
                ? Number(args.timestamp)
                : creationTime;

              txs.push({
                type: "Loan Funded",
                amount: loanAmount,
                token: loanTokenName,
                direction: "in",
                timestamp: fundedTime,
              });
            }
          }

          // Loan Cancelled (status = 3 in many contracts)
          if (Number(loan.status) === 3) {
            const filterCancelled = contract.filters.LoanCancelled(loan.loanId);
            const latestBlock = await provider.getBlockNumber();
            const fromBlock = latestBlock - 499;
            const eventsCancelled = await contract.queryFilter(
              filterCancelled,
              fromBlock,
              latestBlock
            );
            if (eventsCancelled.length > 0) {
              const evtCancelled = eventsCancelled[eventsCancelled.length - 1];
              const args =
                (evtCancelled as any).args ||
                contract.interface.parseLog(evtCancelled)?.args;
              const cancelledTime = args?.timestamp
                ? Number(args.timestamp)
                : creationTime;

              txs.push({
                type: "Loan Cancelled",
                amount: collateralAmount,
                token: collateralTokenName,
                direction: "in",
                timestamp: cancelledTime,
              });
            }
          }

          // Loan Repaid (status = 2)
          if (Number(loan.status) === 2) {
            const filterRepaid = contract.filters.LoanRepaid(loan.loanId);
            const latestBlock = await provider.getBlockNumber();
            const fromBlock = latestBlock - 499;
            const eventsRepaid = await contract.queryFilter(
              filterRepaid,
              fromBlock,
              latestBlock
            );
            if (eventsRepaid.length > 0) {
              const evtRepaid = eventsRepaid[eventsRepaid.length - 1];
              const args =
                (evtRepaid as any).args ||
                contract.interface.parseLog(evtRepaid)?.args;
              const repaidTime = args?.timestamp
                ? Number(args.timestamp)
                : null;
              const repaidAmount = args?.amount
                ? ethers.formatUnits(args.amount, loanDecimals)
                : loanAmount;

              // Outgoing loan repayment
              txs.push({
                type: "Loan Repaid",
                amount: repaidAmount,
                token: loanTokenName,
                direction: "out",
                timestamp: repaidTime,
              });

              // Incoming collateral return
              txs.push({
                type: "Collateral Returned",
                amount: collateralAmount,
                token: collateralTokenName,
                direction: "in",
                timestamp: repaidTime,
              });
            }
          }
        }

        setTransactions(
          txs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        );
      } catch (err) {
        console.error("Transaction fetch error:", err);
      }
    };

    fetchTransactions();
  }, [userAddress]);

  return (
    <div className="bg-white rounded-md p-4 shadow-sm border border-gray-100">
      <h4 className="font-semibold mb-3 text-lg text-gray-800">
        Recent Transactions
      </h4>
      {transactions.length === 0 ? (
        <p className="text-gray-500">No recent transactions.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {transactions.map((tx, index) => (
            <li
              key={index}
              className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md border border-gray-200 shadow-sm"
            >
              <div>
                <span className="font-medium">{tx.type}</span>
                <span className="block text-gray-500 text-xs">
                  {new Date((tx.timestamp || 0) * 1000).toLocaleString()}
                </span>
              </div>
              <span
                className={`font-semibold ${
                  tx.direction === "in" ? "text-green-600" : "text-red-600"
                }`}
              >
                {tx.direction === "in" ? "+" : "-"} {tx.amount} {tx.token}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TransactionHistory;
