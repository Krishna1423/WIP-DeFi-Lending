import { useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { useEthersSigner } from "../hooks/useEthersSigner";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../constants/contract";
import { tokenAddressMap } from "../constants/tokens";
import { useTokenDecimals } from "../hooks/useTokenDecimals";
import { approveToken } from "../hooks/approveToken";

const LoanForm = () => {
  const { address, isConnected, chain } = useAccount();
  const signer = useEthersSigner({ chainId: chain?.id });

  // Form state
  const [loanToken, setLoanToken] = useState("ETH");
  const [loanAmount, setLoanAmount] = useState("");
  const [collateralToken, setCollateralToken] = useState("ETH");
  const [collateralAmount, setCollateralAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [interestRate, setInterestRate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  // Add logic for equating tokens with addresses
  const collateralTokenAddress = tokenAddressMap[collateralToken];
  const loanTokenAddress = tokenAddressMap[loanToken];

  //  Get decimals dynamically
  const { decimals: loanDecimals, error: decimalsError } =
    useTokenDecimals(loanTokenAddress);
  const { decimals: collateralDecimals, error: collateralDecimalsError } =
    useTokenDecimals(collateralTokenAddress);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTxHash("");

    if (!isConnected || !address || !signer) {
      setError("Please connect your wallet.");
      return;
    }

    if (!loanTokenAddress || !loanDecimals) {
      setError("Invalid loan token or decimals not loaded yet.");
      return;
    }

    try {
      setIsSubmitting(true);
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
        BigInt(duration) * BigInt(24) * BigInt(60) * BigInt(60); // convert days to seconds

      await approveToken(
        collateralTokenAddress,
        CONTRACT_ADDRESS,
        parsedCollateralAmount,
        signer
      );

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
      setError(err.message || "Transaction failed.");
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
        <div>
          <label className="block text-sm font-medium mb-1">Loan Token</label>
          <select
            value={loanToken}
            onChange={(e) => setLoanToken(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="ETH">ETH</option>
            <option value="WETH">WETH</option>
            <option value="DAI">DAI</option>
            <option value="USDC">USDC</option>
            <option value="EURC">EURC</option>
          </select>
        </div>
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
            <option value="WETH">WETH</option>
            <option value="USDC">USDC</option>
            <option value="EURC">EURC</option>
          </select>
        </div>

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

// const LoanForm = ({ onClose }: { onClose?: () => void }) => {
//   const [loanAmount, setLoanAmount] = useState("");
//   const [collateralToken, setCollateralToken] = useState("ETH");
//   const [collateralAmount, setCollateralAmount] = useState("");
//   const [duration, setDuration] = useState("");
//   const [interestRate, setInterestRate] = useState("");

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();

//     // TODO: Add smart contract call logic
//     const loanData = {
//       loanAmount,
//       collateralToken,
//       collateralAmount,
//       duration,
//       interestRate,
//     };

//     console.log("Loan Request Data:", loanData);
//     alert("Loan request submitted (mock)");
//   };

//   return (
//     <form
//       onSubmit={handleSubmit}
//       className="loan-form p-6 bg-white rounded-xl shadow-md"
//     >
//       <h2 className="text-2xl font-semibold mb-4">Request a Loan</h2>
//       <div className="space-y-4">
//         <div>
//           <label className="block text-sm font-medium mb-1">
//             Loan Amount (DAI)
//           </label>
//           <input
//             type="number"
//             value={loanAmount}
//             onChange={(e) => setLoanAmount(e.target.value)}
//             className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
//             placeholder="500"
//             required
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium mb-1">
//             Collateral Token
//           </label>
//           <select
//             value={collateralToken}
//             onChange={(e) => setCollateralToken(e.target.value)}
//             className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
//           >
//             <option value="ETH">ETH</option>
//             <option value="WETH">WETH</option>
//             <option value="USDC">USDC</option>
//             {/* Add other supported tokens */}
//           </select>
//         </div>

//         <div>
//           <label className="block text-sm font-medium mb-1">
//             Collateral Amount
//           </label>
//           <input
//             type="number"
//             value={collateralAmount}
//             onChange={(e) => setCollateralAmount(e.target.value)}
//             className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
//             placeholder="0.1"
//             required
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium mb-1">
//             Loan Duration (in days)
//           </label>
//           <input
//             type="number"
//             value={duration}
//             onChange={(e) => setDuration(e.target.value)}
//             className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
//             placeholder="30"
//             required
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium mb-1">
//             Interest Rate (%)
//           </label>
//           <input
//             type="number"
//             value={interestRate}
//             onChange={(e) => setInterestRate(e.target.value)}
//             className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
//             placeholder="5"
//             required
//           />
//         </div>

//         <button
//           type="submit"
//           className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
//         >
//           Submit Loan Request
//         </button>
//       </div>
//     </form>
//   );
// };

// export default LoanForm;
