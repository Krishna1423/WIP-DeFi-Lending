import { useState } from "react";

const LoanForm = () => {
  const [loanAmount, setLoanAmount] = useState("");
  const [collateralToken, setCollateralToken] = useState("ETH");
  const [collateralAmount, setCollateralAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [interestRate, setInterestRate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // TODO: Add smart contract call logic
    const loanData = {
      loanAmount,
      collateralToken,
      collateralAmount,
      duration,
      interestRate,
    };

    console.log("Loan Request Data:", loanData);
    alert("Loan request submitted (mock)");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="loan-form p-6 bg-white rounded-xl shadow-md"
    >
      <h2 className="text-2xl font-semibold mb-4">Request a Loan</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Loan Amount (DAI)
          </label>
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
            <option value="WETH">WETH</option>
            <option value="USDC">USDC</option>
            {/* Add other supported tokens */}
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
            Loan Duration (in days)
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
          className="w-full py-3 bg-primary hover:bg-secondary rounded-lg text-white font-medium"
        >
          Submit Loan Request
        </button>
      </div>
    </form>
  );
};

export default LoanForm;
