import { useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { useEthersSigner } from "../hooks/useEthersSigner";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../constants/contract";
import { tokenAddressMap } from "../constants/tokens";
import { approveToken } from "../hooks/approveToken";
import { getTokenDecimals } from "../utils/useTokenDecimals";

const LoanForm = () => {
  const { address, isConnected, chain } = useAccount();
  const signer = useEthersSigner({ chainId: chain?.id });

  const [loanToken, setLoanToken] = useState("ETH");
  const [loanAmount, setLoanAmount] = useState("");
  const [collateralToken, setCollateralToken] = useState("ETH");
  const [collateralAmount, setCollateralAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [interestRate, setInterestRate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTxHash("");

    if (!isConnected || !address || !signer) {
      setError("Please connect your wallet.");
      return;
    }

    const collateralTokenAddress = tokenAddressMap[collateralToken];
    const loanTokenAddress = tokenAddressMap[loanToken];

    if (!collateralTokenAddress || !loanTokenAddress) {
      setError("Invalid token selection.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Get decimals only when user submits
      const loanDecimals = await getTokenDecimals(loanTokenAddress);
      const collateralDecimals = await getTokenDecimals(collateralTokenAddress);

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const parsedLoanAmount = ethers.parseUnits(loanAmount, loanDecimals);
      const parsedCollateralAmount = ethers.parseUnits(
        collateralAmount,
        collateralDecimals
      );
      const parsedInterest = BigInt(interestRate);
      const parsedDuration =
        BigInt(duration) * BigInt(24) * BigInt(60) * BigInt(60);

      // Approve collateral
      await approveToken(
        collateralTokenAddress,
        CONTRACT_ADDRESS,
        parsedCollateralAmount,
        signer
      );

      // Send requestLoan transaction
      const tx = await contract.requestLoan(
        collateralTokenAddress,
        loanTokenAddress,
        parsedCollateralAmount,
        parsedLoanAmount,
        parsedInterest,
        parsedDuration
      );

      await tx.wait();
      setTxHash(tx.hash);
    } catch (err: any) {
      console.error("Loan request error:", err);
      let friendlyError = "Transaction failed.";

      // 1. Try ethers.js v6 "reason"
      if (err.reason) {
        friendlyError = err.reason;
      }
      // 2. Try contract revert with Error(string)
      else if (err.error && err.error.message) {
        friendlyError = err.error.message;
      }
      // 3. Try parsing "execution reverted: ..."
      else if (err.message) {
        const match = err.message.match(/execution reverted(?:\:)?\s*(.*)/i);
        friendlyError = match && match[1] ? match[1] : err.message;
      }

      // cap error length so UI doesn't break
      if (friendlyError.length > 120) {
        friendlyError = friendlyError.slice(0, 120) + "...";
      }

      setError(friendlyError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="loan-form p-6 bg-white rounded-xl shadow-md max-w-md w-full mx-auto"
    >
      <h2 className="text-2xl font-semibold mb-4">Request a Loan</h2>
      <div className="space-y-4">
        {/* Loan Token */}
        <div>
          <label className="block text-sm font-medium mb-1">Loan Token</label>
          <select
            value={loanToken}
            onChange={(e) => setLoanToken(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="ETH">ETH</option>
            <option value="LINK">LINK</option>
            <option value="DAI">DAI</option>
            <option value="USDC">USDC</option>
            <option value="EURC">EURC</option>
          </select>
        </div>

        {/* Loan Amount */}
        <div>
          <label className="block text-sm font-medium mb-1">Loan Amount</label>
          <input
            type="number"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
            placeholder="500"
            required
          />
        </div>

        {/* Collateral Token */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Collateral Token
          </label>
          <select
            value={collateralToken}
            onChange={(e) => setCollateralToken(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="ETH">ETH</option>
            <option value="DAI">DAI</option>
            <option value="LINK">LINK</option>
            <option value="USDC">USDC</option>
            <option value="EURC">EURC</option>
          </select>
        </div>

        {/* Collateral Amount */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Collateral Amount
          </label>
          <input
            type="number"
            value={collateralAmount}
            onChange={(e) => setCollateralAmount(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
            placeholder="0.1"
            required
          />
        </div>

        {/* Loan Duration */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Loan Duration (days)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
            placeholder="30"
            required
          />
        </div>

        {/* Interest Rate */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Interest Rate (%)
          </label>
          <input
            type="number"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
            placeholder="5"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>

        {txHash && (
          <p className="mt-4 text-green-600">
            Transaction successful! Tx Hash:{" "}
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {txHash.slice(0, 10)}...
            </a>
          </p>
        )}

        {error && <p className="mt-4 text-red-600">Error: {error}</p>}
      </div>
    </form>
  );
};

export default LoanForm;
