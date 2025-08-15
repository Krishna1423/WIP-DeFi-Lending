import { useEffect, useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { Contract, ethers } from "ethers";
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  PROVIDER_KEY,
} from "../constants/contract";
import { tokenNameMap } from "../constants/tokens";
import { Card, StatsGrid, TransactionHistory } from "../components";
import LoanForm from "../components/LoanForm";
import UserDashboard from "../components/UserDashboard";
import PriceTicker from "../components/PriceTicker";
import AppFooter from "../components/AppFooter";

const Dashboard = () => {
  const { address, isConnected } = useAccount();

  const provider = useMemo(() => new ethers.JsonRpcProvider(PROVIDER_KEY), []);

  const [loanStats, setLoanStats] = useState<
    Record<string, { borrowed: number; collateral: number }>
  >({});
  const [activeLoans, setActiveLoans] = useState<number>(0);
  const [showLoanForm, setShowLoanForm] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) return;

    const fetchStats = async () => {
      try {
        const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const [
          collateralTokens,
          collateralAmounts,
          loanTokens,
          loanAmounts,
          activeLoansCount,
        ] = await contract.getUserStats(address);

        const parsedStats: Record<
          string,
          { borrowed: number; collateral: number }
        > = {};

        // Collateral stats
        collateralTokens.forEach((tokenAddress: string, index: number) => {
          const lower = tokenAddress.toLowerCase();
          const symbol = tokenNameMap[lower] || tokenAddress.slice(0, 6);
          let amount = 0;

          if (
            lower === "0x08210f9170f89ab7658f0b5e3ff39b0e03c594d4" ||
            lower === "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"
          ) {
            amount = Number(collateralAmounts[index]) / 1e6;
          } else {
            amount = Number(collateralAmounts[index]) / 1e18;
          }

          if (!parsedStats[symbol]) {
            parsedStats[symbol] = { borrowed: 0, collateral: 0 };
          }
          parsedStats[symbol].collateral = amount;
        });

        // Loan stats
        loanTokens.forEach((tokenAddress: string, index: number) => {
          const lower = tokenAddress.toLowerCase();
          const symbol = tokenNameMap[lower] || tokenAddress.slice(0, 6);
          const amount = Number(loanAmounts[index]) / 1e6;

          if (!parsedStats[symbol]) {
            parsedStats[symbol] = { borrowed: 0, collateral: 0 };
          }
          parsedStats[symbol].borrowed = amount;
        });

        // Single batched update
        setLoanStats(parsedStats);
        setActiveLoans(Number(activeLoansCount));
      } catch (error) {
        console.error("Error fetching user stats:", error);
      }
    };

    fetchStats();
  }, [address, isConnected, provider]);

  return (
    <div className="dashboard-container p-6">
      <h1 className="text-3xl font-bold mb-6">Your Financial Overview</h1>

      <StatsGrid stats={loanStats} activeLoans={activeLoans} />

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <UserDashboard />
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
          <PriceTicker />
          <LoanForm />
        </div>
      )}
      <div>
        <br></br>
        <AppFooter />
      </div>
    </div>
  );
};

export default Dashboard;
