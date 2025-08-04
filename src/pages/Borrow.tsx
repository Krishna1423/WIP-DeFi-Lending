import LoanForm from "../components/LoanForm";
import PriceTicker from "../components/PriceTicker";

const Borrow = () => {
  return (
    <div className="mt-8 space-y-6">
      <PriceTicker />
      <LoanForm />
    </div>
  );
};

export default Borrow;
