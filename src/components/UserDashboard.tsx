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

// Mock User Loan Data
const userStats = {
  totalBorrowed: 3000,
  totalRepaid: 1800,
  totalInterestPaid: 200,
  loanHistory: [
    { date: "2024-01", amount: 500 },
    { date: "2024-03", amount: 800 },
    { date: "2024-05", amount: 700 },
    { date: "2024-07", amount: 1000 },
  ],
  collateralBreakdown: [
    { token: "ETH", value: 1800 },
    { token: "USDC", value: 1200 },
  ],
};

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50"];

export default function UserDashboard() {
  const repaidRatio = userStats.totalRepaid / userStats.totalBorrowed;

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Borrowed vs Repaid */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h3 className="text-lg font-semibold mb-2">Borrowed vs Repaid</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              dataKey="value"
              data={[
                { name: "Repaid", value: userStats.totalRepaid },
                {
                  name: "Remaining",
                  value: userStats.totalBorrowed - userStats.totalRepaid,
                },
              ]}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              <Cell fill="#4caf50" />
              <Cell fill="#f44336" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Loan History Timeline */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h3 className="text-lg font-semibold mb-2">Loan History</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={userStats.loanHistory}>
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
      </div>

      {/* Collateral Token Breakdown */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h3 className="text-lg font-semibold mb-2">Collateral Breakdown</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={userStats.collateralBreakdown}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="token" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Interest Paid */}
      <div className="bg-white p-4 rounded-xl shadow flex flex-col justify-center items-center">
        <h3 className="text-lg font-semibold mb-2">Total Interest Paid</h3>
        <div className="text-4xl text-blue-600 font-bold">
          ${userStats.totalInterestPaid}
        </div>
      </div>
    </div>
  );
}
