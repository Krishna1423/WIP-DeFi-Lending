// const TransactionHistory = () => {
//     return (
//         <div>
//             <h4 className="font-medium mb-2">Recent Transactions</h4>
//             <ul className="space-y-2">
//                 <li className="flex justify-between">
//                     <span>Loan Payment</span>
//                     <span className="text-green-600">+$200</span>
//                 </li>
//                 <li className="flex justify-between">
//                     <span>Withdrawal</span>
//                     <span className="text-red-600">-$500</span>
//                 </li>
//                 <li className="flex justify-between">
//                     <span>Deposit</span>
//                     <span className="text-green-600">+$1,000</span>
//                 </li>
//             </ul>
//         </div>
//     );
// };

// export default TransactionHistory;

import { useEffect, useState } from "react";

interface Transaction {
  type: string;
  amount: number;
  direction: "in" | "out";
}

// Accept props
interface Props {
  userAddress?: `0x${string}`;
}

const TransactionHistory = ({ userAddress }: Props) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!userAddress) return;

    // TODO: Replace with smart contract data later
    const mockTransactions: Transaction[] = [
      {
        type: "Loan Requested",
        amount: 250,
        direction: "out",
      },
      {
        type: "Loan Repaid",
        amount: 270,
        direction: "in",
      },
      {
        type: "Collateral Deposited",
        amount: 300,
        direction: "out",
      },
    ];

    setTimeout(() => {
      setTransactions(mockTransactions.reverse());
    }, 500);
  }, [userAddress]);

  return (
    <div>
      <h4 className="font-medium mb-2">Recent Transactions</h4>
      {transactions.length === 0 ? (
        <p className="text-gray-500">No recent transactions.</p>
      ) : (
        <ul className="space-y-2">
          {transactions.map((tx, index) => (
            <li key={index} className="flex justify-between">
              <span>{tx.type}</span>
              <span
                className={
                  tx.direction === "in" ? "text-green-600" : "text-red-600"
                }
              >
                {tx.direction === "in" ? "+" : "-"}${tx.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TransactionHistory;
