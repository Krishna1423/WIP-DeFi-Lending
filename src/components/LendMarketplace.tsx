export default function LendMarketplace() {
  const loans = [
    {
      id: 1,
      amount: "250",
      duration: "7",
      interest: "3%",
      borrower: "0x1a2...3b4",
    },
    {
      id: 2,
      amount: "500",
      duration: "30",
      interest: "5%",
      borrower: "0x5c6...7d8",
    },
  ];

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Available Loan Requests</h2>
        <select className="mt-4 md:mt-0 px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>All Loans</option>
          <option>Short-term (7d)</option>
          <option>Medium-term (7-30d)</option>
        </select>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loans.map((loan) => (
          <div
            key={loan.id}
            className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-5 border border-gray-100"
          >
            <div className="text-xl font-bold text-blue-600 mb-2">
              {loan.amount} DAI
            </div>
            <div className="text-sm text-gray-600 mb-4">
              <p>
                <span className="font-medium">Duration:</span> {loan.duration}{" "}
                days
              </p>
              <p>
                <span className="font-medium">Interest:</span> {loan.interest}
              </p>
              <p className="truncate">
                <span className="font-medium">Borrower:</span> {loan.borrower}
              </p>
            </div>
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition-colors">
              Fund Loan
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
