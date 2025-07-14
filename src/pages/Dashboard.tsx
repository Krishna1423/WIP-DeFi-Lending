import { useAccount } from "wagmi";
import { Card, StatsGrid, TransactionHistory } from "../components";
import { useEffect, useState } from "react";
import LoanForm from "../components/LoanForm";

const Dashboard = () => {
  const { address, isConnected } = useAccount();

  const [loanStats, setLoanStats] = useState({
    totalBorrowed: 0,
    totalCollateral: 0,
    activeLoans: 0,
  });

  const [showLoanForm, setShowLoanForm] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      const fetchUserStats = async () => {
        // replace with real smart contract call
        const stats = {
          totalBorrowed: 150,
          totalCollateral: 200,
          activeLoans: 2,
        };
        setLoanStats(stats);
      };

      fetchUserStats();
    }
  }, [address, isConnected]);

  return (
    <div className="dashboard-container p-6">
      <h1 className="text-3xl font-bold mb-6">Your Financial Overview</h1>

      <StatsGrid stats={loanStats} />

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <Card title="Recent Activity">
          <TransactionHistory userAddress={address} />
        </Card>

        <Card title="Quick Actions">
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => setShowLoanForm(true)}
          >
            Request Loan
          </button>
        </Card>
      </div>

      {showLoanForm && (
        <div className="mt-8">
          <LoanForm />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
