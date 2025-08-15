import { useEffect, useLayoutEffect, useState, useMemo } from "react";
import { useAccount } from "wagmi";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { ethers } from "ethers";
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  PROVIDER_KEY,
} from "../constants/contract";
import { tokenNameMap } from "../constants/tokens";

const ERC20_MINIMAL = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#a28fd0"];

export default function UserDashboard() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusData, setStatusData] = useState<
    { name: string; value: number }[]
  >([]);
  const [loanHistory, setLoanHistory] = useState<
    { date: string; amount: number }[]
  >([]);
  const [collateralData, setCollateralData] = useState<
    { name: string; value: number }[]
  >([]);
  const [borrowedData, setBorrowedData] = useState<
    { name: string; value: number }[]
  >([]);

  const provider = useMemo(() => new ethers.JsonRpcProvider(PROVIDER_KEY), []);
  const decimalsCache = useMemo(() => new Map<string, number>(), []);
  const symbolCache = useMemo(() => new Map<string, string>(), []);

  const getDecimals = async (token: string) => {
    const key = token.toLowerCase();
    if (key === ethers.ZeroAddress) return 18;
    if (decimalsCache.has(key)) return decimalsCache.get(key)!;
    try {
      const t = new ethers.Contract(token, ERC20_MINIMAL, provider);
      const d: number = Number(await t.decimals());
      decimalsCache.set(key, d);
      return d;
    } catch {
      decimalsCache.set(key, 18);
      return 18;
    }
  };

  const getSymbol = async (token: string) => {
    const key = token.toLowerCase();
    if (tokenNameMap[key]) return tokenNameMap[key];
    if (symbolCache.has(key)) return symbolCache.get(key)!;
    if (key === ethers.ZeroAddress) {
      symbolCache.set(key, "ETH");
      return "ETH";
    }
    try {
      const t = new ethers.Contract(token, ERC20_MINIMAL, provider);
      const s: string = String(await t.symbol());
      symbolCache.set(key, s);
      return s;
    } catch {
      const short = token.slice(0, 6) + "...";
      symbolCache.set(key, short);
      return short;
    }
  };

  useLayoutEffect(() => {
    if (!isConnected || !address) return;
    setLoading(true);
    setError(null);

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );

    const fetchAndFormat = async () => {
      try {
        // 1. Fetch raw loan data
        const rawLoans = await contract.getLoansByUser(address);
        const statusMap: Record<number, string> = {
          0: "Requested",
          1: "Funded",
          2: "Repaid",
          3: "Defaulted",
          4: "Cancelled",
        };

        const counts = {
          Requested: 0,
          Funded: 0,
          Repaid: 0,
          Defaulted: 0,
          Cancelled: 0,
        };

        const loanHistoryRaw = rawLoans.map((l: any) => {
          const idx = (k: string | number) => l[k] ?? l[Number(k)];
          const status = statusMap[Number(idx("status"))] ?? "Unknown";
          if (status in counts) counts[status as keyof typeof counts]++;

          return {
            date: new Date(
              Number(idx("timestamp")) * 1000
            ).toLocaleDateString(),
            ts: Number(idx("timestamp")),
            amount: Number(idx("loanAmount")),
            token: String(idx("loanToken")).toLowerCase(),
          };
        });

        // 2. Fetch user stats
        const [collateralTokens, collateralAmounts, loanTokens, loanAmounts] =
          await contract.getUserStats(address);

        // 3. Format all data before setting state
        const formattedHistory = await Promise.all(
          loanHistoryRaw.map(
            async (item: {
              date: string;
              amount: number;
              ts?: number;
              token?: string;
            }) => {
              const dec = await getDecimals(item.token ?? "");
              return {
                ...item,
                amount: Number(ethers.formatUnits(item.amount, dec)),
              };
            }
          )
        );

        const formattedCollateral = await Promise.all(
          collateralTokens.map(async (tokenAddr: string, i: number) => {
            const token = tokenAddr.toLowerCase();
            const dec = await getDecimals(token);
            const value = Number(ethers.formatUnits(collateralAmounts[i], dec));
            const name = await getSymbol(token);
            return { name, value };
          })
        );

        const formattedBorrowed = await Promise.all(
          loanTokens.map(async (tokenAddr: string, i: number) => {
            const token = tokenAddr.toLowerCase();
            const dec = await getDecimals(token);
            const value = Number(ethers.formatUnits(loanAmounts[i], dec));
            const name = await getSymbol(token);
            return { name, value };
          })
        );

        // 4. Set state ONCE with fully formatted data
        setStatusData(
          Object.entries(counts).map(([name, value]) => ({ name, value }))
        );
        setLoanHistory(formattedHistory.sort((a, b) => a.ts - b.ts));
        setCollateralData(formattedCollateral.filter((d) => d.value > 0));
        setBorrowedData(formattedBorrowed.filter((d) => d.value > 0));

        setLoading(false);
      } catch (err: any) {
        setError(err?.message ?? String(err));
        setLoading(false);
      }
    };

    fetchAndFormat();
  }, [address, isConnected]);

  const totalValue = (arr: { name: string; value: number }[]) =>
    arr.reduce((s, a) => s + (a.value || 0), 0);

  if (!isConnected) {
    return (
      <div className="bg-white p-4 rounded-xl shadow">
        <h3 className="text-lg font-semibold mb-2">Your Dashboard</h3>
        <p className="text-sm text-gray-500">
          Connect your wallet to view stats.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow min-h-[350px]">
      {/* Loan Status Distribution */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h3 className="text-lg font-semibold mb-2">Loan Status Distribution</h3>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                dataKey="value"
                data={statusData.filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.name} (${entry.value})`}
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Loan Amount Over Time */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h3 className="text-lg font-semibold mb-2">Loan Amount Over Time</h3>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={loanHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#8884d8"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Collateral Composition */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h3 className="text-lg font-semibold mb-2">Collateral Composition</h3>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  dataKey="value"
                  data={collateralData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  label={(entry) =>
                    `${entry.name} (${(
                      (entry.value
                        ? entry.value
                        : 0 / Math.max(1, totalValue(collateralData))) * 100
                    ).toFixed(0)}%)`
                  }
                >
                  {collateralData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs text-gray-600">
              Total collateral: {totalValue(collateralData).toFixed(4)}
            </div>
          </>
        )}
      </div>

      {/* Borrowed Token Composition */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h3 className="text-lg font-semibold mb-2">
          Borrowed Token Composition
        </h3>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={borrowedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs text-gray-600">
              Total borrowed: {totalValue(borrowedData).toFixed(4)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
