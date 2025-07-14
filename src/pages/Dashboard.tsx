import { useAccount } from "wagmi";
import { Card, StatsGrid, TransactionHistory } from "../components";
import { useEffect, useState } from "react";

const Dashboard = () => {
  const { address, isConnected } = useAccount();

  const [loanStats, setLoanStats] = useState({
    totalBorrowed: 0,
    totalCollateral: 0,
    activeLoans: 0,
  });

  useEffect(() => {
    if (isConnected && address) {
      // Replace this mock logic with real contract calls
      const fetchUserStats = async () => {
        // Simulate fetching from a smart contract (replace with real calls)
        const stats = {
          totalBorrowed: 150, // Example: total DAI borrowed
          totalCollateral: 200, // Example: total ETH collateralized
          activeLoans: 2, // Example: number of ongoing loans
        };
        setLoanStats(stats);
      };

      fetchUserStats();
    }
  }, [address, isConnected]);

  return (
    <div className="dashboard-container p-6">
      <h1 className="text-3xl font-bold mb-6">Your Financial Overview</h1>

      {/* Pass real data to StatsGrid */}
      <StatsGrid stats={loanStats} />

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <Card title="Recent Activity">
          <TransactionHistory userAddress={address} />
        </Card>

        <Card title="Quick Actions">
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            Request Loan
          </button>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
