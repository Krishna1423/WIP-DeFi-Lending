"use client";

import { useEffect, useState } from "react";
import { useEthersSigner } from "../hooks/useEthersSigner";
import { ethers } from "ethers";
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  PROVIDER_KEY,
} from "../constants/contract";
import { tokenNameMap } from "../constants/tokens";
import { formatTokenAmount } from "../utils/useTokenDecimals";

type Loan = {
  id: number;
  borrower: string;
  lender: string;
  collateralToken: string;
  loanToken: string;
  collateral: string;
  amount: string;
  interest: number;
  startTime: number;
  duration: number;
  status: string;
};

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

const formatDuration = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
};

export default function LendMarketplace() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const signer = useEthersSigner();
  const [selectedFilter, setSelectedFilter] = useState("All Loans");

  useEffect(() => {
    if (!signer) return;

    const fetchLoans = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(PROVIDER_KEY);
        const loanContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          provider
        );
        const [ids, loanStructs] = await loanContract.getAllRequestedLoans();
        console.log("Loan structs: ", loanStructs);

        const requestedLoans: Loan[] = await Promise.all(
          loanStructs.map(async (loan: any, index: number) => {
            const amountFormatted = await formatTokenAmount(
              loan.loanToken,
              loan.loanAmount
            );
            const collateralFormatted = await formatTokenAmount(
              loan.collateralToken,
              loan.collateralAmount
            );

            return {
              id: Number(ids[index]), // real on-chain ID
              borrower: loan.borrower,
              amount: amountFormatted,
              loanToken: loan.loanToken,
              collateral: collateralFormatted,
              collateralToken: loan.collateralToken,
              interest: Number(loan.interestRate),
              duration: Number(loan.duration),
            };
          })
        );

        setLoans(requestedLoans);
        console.log("Requested Loans", requestedLoans);
      } catch (err) {
        console.error("Failed to fetch loans:", err);
      }
    };

    fetchLoans();
  }, [signer]);

  const handleFund = async (loanId: number) => {
    try {
      if (!signer) return alert("Connect wallet first");

      const loan = loans.find((l) => l.id === loanId);
      if (!loan) return alert("Loan not found");

      console.log("Handle fund la loan id: ", loanId);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );
      const tokenContract = new ethers.Contract(
        loan.loanToken,
        ERC20_ABI,
        signer
      );

      // Dynamically fetch decimals instead of using the hook
      let decimals = 18;
      try {
        decimals = await tokenContract.decimals();
      } catch (err) {
        console.warn("Falling back to 6 decimals for tokens like EURC.");
        // Hardcode fallback for tokens like EURC if needed
        if (
          loan.loanToken.toLowerCase() ===
            "0x08210f9170f89ab7658f0b5e3ff39b0e03c594d4" ||
          "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"
        ) {
          decimals = 6;
        }
      }

      const parsedLoanAmount = ethers.parseUnits(loan.amount, decimals);

      // Approve loan amount
      const allowance: bigint = await tokenContract.allowance(
        await signer.getAddress(),
        CONTRACT_ADDRESS
      );

      if (allowance < parsedLoanAmount) {
        const approveTx = await tokenContract.approve(
          CONTRACT_ADDRESS,
          parsedLoanAmount
        );
        await approveTx.wait();
        console.log("Token approved");
      }

      // Fund loan
      const tx = await contract.fundLoan(loanId);
      await tx.wait();
      alert(`Loan #${loanId} funded successfully`);
    } catch (err) {
      console.error("Funding failed:", err);
      alert("Funding failed. See console for details.");
    }
  };

  const getFilteredLoans = () => {
    switch (selectedFilter) {
      case "Short-term (7d)":
        return loans.filter((loan) => loan.duration <= 7 * 24 * 60 * 60);
      case "Medium-term (7-30d)":
        return loans.filter(
          (loan) =>
            loan.duration > 7 * 24 * 60 * 60 &&
            loan.duration <= 30 * 24 * 60 * 60
        );
      case "Long-term (30d)":
        return loans.filter((loan) => loan.duration > 30 * 24 * 60 * 60);
      default:
        return loans;
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Available Loan Requests</h2>
        <select
          className="mt-4 md:mt-0 px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
        >
          <option>All Loans</option>
          <option>Short-term (7d)</option>
          <option>Medium-term (7-30d)</option>
          <option>Long-term (30d)</option>
        </select>
      </div>

      {getFilteredLoans().length === 0 ? (
        <p>No loans found.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getFilteredLoans().map((loan) => (
            <div
              key={loan.id}
              className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-5 border border-gray-100"
            >
              <div className="text-xl font-bold text-blue-600 mb-2">
                {loan.amount}{" "}
                {tokenNameMap[loan.loanToken.toLowerCase()] || "Token"}
              </div>
              <div className="text-sm text-gray-600 mb-4">
                <p>
                  <span className="font-medium">Borrower:</span> {loan.borrower}
                </p>
                <p>
                  <span className="font-medium">Collateral:</span>{" "}
                  {loan.collateral}{" "}
                  {tokenNameMap[loan.collateralToken.toLowerCase()] || "Token"}
                </p>
                <p>
                  <span className="font-medium">Duration:</span>{" "}
                  {formatDuration(loan.duration)}
                </p>
                <p>
                  <span className="font-medium">Interest:</span> {loan.interest}
                  %
                </p>
                {/* <p className="truncate">
                <span className="font-medium">Borrower:</span> {formatAddress(loan.borrower)}
              </p> */}
              </div>
              <button
                onClick={() => handleFund(loan.id)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              >
                Fund Loan
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
