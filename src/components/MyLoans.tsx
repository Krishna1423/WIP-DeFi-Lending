import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { getFormattedAmount } from "../hooks/useTokenDecimals";
import { Card } from "../components";
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  PROVIDER_KEY,
} from "../constants/contract";
import { useEthersSigner } from "../hooks/useEthersSigner";
import { tokenNameMap } from "../constants/tokens";

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
  status: number;
};

const STATUS_LABELS = [
  "Requested",
  "Funded",
  "Repaid",
  "Defaulted",
  "Cancelled",
];

const formatDuration = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
};

const MyLoans = () => {
  const { address, isConnected } = useAccount();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filter, setFilter] = useState<"all" | "active">("all");
  const [loadingLoanId, setLoadingLoanId] = useState<number | null>(null);

  const provider = new ethers.JsonRpcProvider(PROVIDER_KEY);
  const signer = useEthersSigner();

  useEffect(() => {
    if (!isConnected || !address) return;

    const fetchLoans = async () => {
      try {
        const loanContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          provider
        );

        const loansData =
          filter === "all"
            ? await loanContract.getLoansByUser(address)
            : await loanContract.getActiveLoansByUser(address);
        console.log("LoansData: ", loansData);

        const parsedLoans: Loan[] = await Promise.all(
          loansData.map(async (loan: any, index: number) => {
            const amountFormatted = await getFormattedAmount(
              loan.loanToken,
              loan.loanAmount
            );
            const collateralFormatted = await getFormattedAmount(
              loan.collateralToken,
              loan.collateralAmount
            );

            return {
              id: index,
              borrower: loan.borrower,
              amount: amountFormatted,
              loanToken: loan.loanToken,
              collateral: collateralFormatted,
              collateralToken: loan.collateralToken,
              interest: Number(loan.interestRate),
              duration: Number(loan.duration),
              status: Number(loan.status),
            };
          })
        );

        setLoans(parsedLoans);
        console.log("Loans", parsedLoans);
      } catch (err) {
        console.error("Failed to fetch loans:", err);
      }
    };

    fetchLoans();
  }, [isConnected, address, filter]);

  return (
    <div>
      <div className="mb-4">
        <label className="mr-4 font-medium">Filter:</label>
        <select
          className="border px-3 py-1 rounded"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | "active")}
        >
          <option value="all">All Loans</option>
          <option value="active">Active Loans</option>
        </select>
      </div>

      {loans.length === 0 ? (
        <p>No loans found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loans.map((loan) => (
            <Card key={loan.id} title={`Loan ${loan.id + 1}`}>
              <p>
                <strong>Amount:</strong> {loan.amount}{" "}
                {tokenNameMap[loan.loanToken.toLowerCase()] || "Token"}
              </p>
              <p>
                <strong>Collateral:</strong> {loan.collateral}{" "}
                {tokenNameMap[loan.collateralToken.toLowerCase()] || "Token"}
              </p>
              <p>
                <strong>Interest:</strong> {loan.interest}
                {"%"}
              </p>
              <p>
                <strong>Duration:</strong> {formatDuration(loan.duration)}
              </p>
              <p>
                <strong>Status:</strong> {STATUS_LABELS[loan.status]}
              </p>

              {/* Cancel Button: show if Requested */}
              {loan.status === 0 && (
                <button
                  className="mt-2 px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  disabled={loadingLoanId === loan.id}
                  onClick={async () => {
                    const confirmed = window.confirm(
                      "Are you sure you want to cancel this loan?"
                    );
                    if (!confirmed) return;

                    try {
                      setLoadingLoanId(loan.id);
                      const signer = await new ethers.BrowserProvider(
                        window.ethereum
                      ).getSigner();
                      const contract = new ethers.Contract(
                        CONTRACT_ADDRESS,
                        CONTRACT_ABI,
                        signer
                      );
                      const tx = await contract.cancelLoan(loan.id);
                      await tx.wait();
                      alert("Loan cancelled successfully.");
                      window.location.reload();
                    } catch (err) {
                      console.error("Cancel failed:", err);
                      alert("Cancel failed. Check console.");
                    } finally {
                      setLoadingLoanId(null);
                    }
                  }}
                >
                  {loadingLoanId === loan.id ? "Cancelling..." : "Cancel Loan"}
                </button>
              )}

              {/* Repay Button: show if Funded */}
              {loan.status === 1 && (
                <button
                  className="mt-2 px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 ml-2 disabled:opacity-50"
                  disabled={loadingLoanId === loan.id}
                  onClick={async () => {
                    try {
                      setLoadingLoanId(loan.id);
                      if (!signer)
                        throw new Error(
                          "No signer found. Connect wallet first."
                        );
                      let repaymentAmount = null;
                      if (
                        loan.loanToken ==
                          "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" ||
                        "0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4"
                      ) {
                        repaymentAmount = ethers.parseUnits(
                          (parseFloat(loan.amount) * (1 + loan.interest / 100))
                            .toFixed(6)
                            .toString(),
                          6
                        );
                      } else {
                        repaymentAmount = ethers.parseUnits(
                          (
                            parseFloat(loan.amount) *
                            (1 + loan.interest / 100)
                          ).toString(),
                          18 // Adjust this if your token has different decimals
                        );
                      }
                      const loanTokenContract = new ethers.Contract(
                        loan.loanToken,
                        [
                          "function approve(address spender, uint256 amount) public returns (bool)",
                          "function allowance(address owner, address spender) public view returns (uint256)",
                        ],
                        signer
                      );

                      const currentAllowance =
                        await loanTokenContract.allowance(
                          await signer.getAddress(),
                          CONTRACT_ADDRESS
                        );

                      if (currentAllowance < repaymentAmount) {
                        const approveTx = await loanTokenContract.approve(
                          CONTRACT_ADDRESS,
                          repaymentAmount
                        );
                        await approveTx.wait();
                        console.log("Token approved successfully");
                      }

                      const contract = new ethers.Contract(
                        CONTRACT_ADDRESS,
                        CONTRACT_ABI,
                        signer
                      );
                      const tx = await contract.repayLoan(loan.id);
                      await tx.wait();

                      alert("Loan repaid successfully.");
                      window.location.reload();
                    } catch (err) {
                      console.error("Repay failed:", err);
                      alert("Repay failed. Check console.");
                    } finally {
                      setLoadingLoanId(null);
                    }
                  }}
                >
                  {loadingLoanId === loan.id ? "Repaying..." : "Repay Loan"}
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyLoans;
