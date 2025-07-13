
import { useState } from "react";

const LoanForm = () => {
    const [amount, setAmount] = useState("");

    return (
        <div className="loan-form p-6 bg-white rounded-xl shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Get a Loan</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Amount (USD)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
                        placeholder="500"
                    />
                </div>
                <button className="w-full py-3 bg-primary hover:bg-secondary rounded-lg text-white font-medium">
                    Continue
                </button>
            </div>
        </div>
    );
};

export default LoanForm;