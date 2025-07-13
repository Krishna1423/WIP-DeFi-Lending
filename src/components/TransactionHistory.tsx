const TransactionHistory = () => {
    return (
        <div>
            <h4 className="font-medium mb-2">Recent Transactions</h4>
            <ul className="space-y-2">
                <li className="flex justify-between">
                    <span>Loan Payment</span>
                    <span className="text-green-600">+$200</span>
                </li>
                <li className="flex justify-between">
                    <span>Withdrawal</span>
                    <span className="text-red-600">-$500</span>
                </li>
                <li className="flex justify-between">
                    <span>Deposit</span>
                    <span className="text-green-600">+$1,000</span>
                </li>
            </ul>
        </div>
    );
};

export default TransactionHistory;