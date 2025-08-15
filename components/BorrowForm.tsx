import LoanCalculator from "./LoanCalculator";
import LoanForm from "./LoanForm";

export default function Borrow() {
  return (
    <div className="page-container">
      <div className="grid-layout">
        <div className="card form-section">
          <h2>Request New Loan</h2>
          <LoanForm />
        </div>

        <div className="card calculator-section">
          <h2>Loan Calculator</h2>
          <LoanCalculator />
        </div>
      </div>
    </div>
  );
}
